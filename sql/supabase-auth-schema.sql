create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  username text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  lesson text not null,
  content text not null default 'lesson',
  progress numeric not null default 0,
  score integer not null default 0,
  total integer not null default 0,
  last_position jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, subject, lesson, content)
);

create table if not exists public.saved_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  lesson text not null,
  chinese text not null,
  pinyin text,
  vietnamese text,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, subject, lesson, chinese)
);

create table if not exists public.user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  lesson text not null,
  content text not null default 'general',
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, subject, lesson, content)
);

create table if not exists public.wrong_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  lesson text not null,
  content text not null default 'test',
  question text,
  user_answer text,
  correct_answer text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  streak_days integer not null default 0,
  last_login_date date,
  total_exp integer not null default 0,
  total_unique_correct integer not null default 0,
  current_level numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_correct_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  course_id text not null,
  lesson_id text not null,
  exercise_type text not null,
  created_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create table if not exists public.user_daily_lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text,
  lesson_id text not null,
  activity_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, lesson_id, activity_date)
);

alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.saved_words enable row level security;
alter table public.user_notes enable row level security;
alter table public.wrong_answers enable row level security;
alter table public.user_stats enable row level security;
alter table public.user_correct_answers enable row level security;
alter table public.user_daily_lessons enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "progress_all_own" on public.user_progress;
drop policy if exists "saved_words_all_own" on public.saved_words;
drop policy if exists "notes_all_own" on public.user_notes;
drop policy if exists "wrong_answers_all_own" on public.wrong_answers;
drop policy if exists "stats_select_own" on public.user_stats;
drop policy if exists "correct_answers_select_own" on public.user_correct_answers;
drop policy if exists "daily_lessons_select_own" on public.user_daily_lessons;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "progress_all_own" on public.user_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "saved_words_all_own" on public.saved_words
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notes_all_own" on public.user_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "wrong_answers_all_own" on public.wrong_answers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "stats_select_own" on public.user_stats
  for select using (auth.uid() = user_id);

create policy "correct_answers_select_own" on public.user_correct_answers
  for select using (auth.uid() = user_id);

create policy "daily_lessons_select_own" on public.user_daily_lessons
  for select using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, username, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'username',
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    username = coalesce(excluded.username, public.profiles.username),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  insert into public.user_stats (user_id, streak_days, total_exp, total_unique_correct, current_level)
  values (new.id, 0, 0, 0, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.ensure_user_stats(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_stats (user_id, streak_days, total_exp, total_unique_correct, current_level)
  values (p_user_id, 0, 0, 0, 0)
  on conflict (user_id) do nothing;
end;
$$;

create or replace function public.mark_daily_login()
returns table (
  streak_days integer,
  last_login_date date,
  total_exp integer,
  total_unique_correct integer,
  current_level numeric
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_stats public.user_stats%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.ensure_user_stats(v_user_id);

  select * into v_stats
  from public.user_stats
  where user_id = v_user_id
  for update;

  if v_stats.last_login_date = v_today then
    -- Logged in today already: no increment.
    null;
  elsif v_stats.last_login_date = (v_today - 1) then
    v_stats.streak_days := coalesce(v_stats.streak_days, 0) + 1;
    v_stats.last_login_date := v_today;
  else
    v_stats.streak_days := 1;
    v_stats.last_login_date := v_today;
  end if;

  update public.user_stats us
  set
    streak_days = v_stats.streak_days,
    last_login_date = v_stats.last_login_date,
    updated_at = now()
  where us.user_id = v_user_id;

  return query
  select us.streak_days, us.last_login_date, us.total_exp, us.total_unique_correct, us.current_level
  from public.user_stats us
  where us.user_id = v_user_id;
end;
$$;

create or replace function public.award_correct_answer(
  p_question_id text,
  p_course_id text default '',
  p_lesson_id text default '',
  p_exercise_type text default 'test'
)
returns table (
  new_exp_awarded boolean,
  already_awarded boolean,
  total_exp integer,
  total_unique_correct integer,
  current_level numeric
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_inserted integer := 0;
  v_unique_correct integer := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if nullif(trim(p_question_id), '') is null then
    raise exception 'question_id is required';
  end if;

  perform public.ensure_user_stats(v_user_id);

  insert into public.user_correct_answers (user_id, question_id, course_id, lesson_id, exercise_type)
  values (
    v_user_id,
    trim(p_question_id),
    coalesce(nullif(trim(p_course_id), ''), 'unknown'),
    coalesce(nullif(trim(p_lesson_id), ''), 'unknown'),
    coalesce(nullif(trim(p_exercise_type), ''), 'test')
  )
  on conflict (user_id, question_id) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    update public.user_stats us
    set
      total_exp = us.total_exp + 1,
      total_unique_correct = us.total_unique_correct + 1,
      current_level = floor(((us.total_unique_correct + 1)::numeric / 500)) * 0.5,
      updated_at = now()
    where us.user_id = v_user_id
    returning us.total_unique_correct into v_unique_correct;
  end if;

  return query
  select
    (v_inserted > 0) as new_exp_awarded,
    (v_inserted = 0) as already_awarded,
    us.total_exp,
    us.total_unique_correct,
    us.current_level
  from public.user_stats us
  where us.user_id = v_user_id;
end;
$$;

create or replace function public.mark_lesson_activity(
  p_lesson_id text,
  p_course_id text default ''
)
returns table (
  today_lesson_count integer
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if nullif(trim(p_lesson_id), '') is null then
    raise exception 'lesson_id is required';
  end if;

  perform public.ensure_user_stats(v_user_id);

  insert into public.user_daily_lessons (user_id, course_id, lesson_id, activity_date)
  values (
    v_user_id,
    coalesce(nullif(trim(p_course_id), ''), 'unknown'),
    trim(p_lesson_id),
    v_today
  )
  on conflict (user_id, lesson_id, activity_date) do nothing;

  return query
  select count(*)::integer
  from public.user_daily_lessons
  where user_id = v_user_id
    and activity_date = v_today;
end;
$$;

create or replace function public.get_dashboard_stats()
returns table (
  streak_days integer,
  last_login_date date,
  total_exp integer,
  total_unique_correct integer,
  current_level numeric,
  today_lesson_count integer
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.ensure_user_stats(v_user_id);

  return query
  select
    us.streak_days,
    us.last_login_date,
    us.total_exp,
    us.total_unique_correct,
    us.current_level,
    (
      select count(*)::integer
      from public.user_daily_lessons udl
      where udl.user_id = v_user_id
        and udl.activity_date = v_today
    ) as today_lesson_count
  from public.user_stats us
  where us.user_id = v_user_id;
end;
$$;

revoke all on function public.ensure_user_stats(uuid) from public, anon, authenticated;
grant execute on function public.mark_daily_login() to authenticated;
grant execute on function public.award_correct_answer(text, text, text, text) to authenticated;
grant execute on function public.mark_lesson_activity(text, text) to authenticated;
grant execute on function public.get_dashboard_stats() to authenticated;
