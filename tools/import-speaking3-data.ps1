$ErrorActionPreference = "Stop"

$appRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = "C:\Users\Admin\.codex\attachments\dd4c81c4-98e4-4ff9-b60b-7e22500cf817\pasted-text.txt"
$outDir = Join-Path $appRoot "data"

function Normalize-Cell([string]$value) {
  if ($null -eq $value) { return "" }
  return ($value -replace [char]0xFEFF, "").Trim()
}

function Get-LessonNumber([string]$value) {
  $text = Normalize-Cell $value
  if ($text -match "^[bB].*?(\d+)") { return [int]$Matches[1] }
  if ($text -match "^(\d+)$") { return [int]$Matches[1] }
  return $null
}

function Star-Count([string]$value) {
  $text = Normalize-Cell $value
  if ([string]::IsNullOrWhiteSpace($text)) { return 0 }
  return ([regex]::Matches($text, [regex]::Escape([string][char]0x2B50))).Count
}

function New-ArrayList() {
  return New-Object System.Collections.ArrayList
}

function Ensure-Lesson($data, [int]$lessonNumber) {
  $key = [string]$lessonNumber
  if (-not $data.Contains($key)) {
    $data[$key] = [pscustomobject]@{
      title = "Bai $lessonNumber"
      vietnameseTitle = ""
      textTitles = New-ArrayList
      vocabulary = New-ArrayList
      paragraph = New-ArrayList
      texts = New-ArrayList
      grammar = New-ArrayList
      structure = New-ArrayList
      example = New-ArrayList
    }
  }
  return ,$data[$key]
}

function Add-Item($lesson, [string]$name, $item) {
  [void]$lesson.$name.Add($item)
}

function New-PracticeItem([string]$chinese, [string]$pinyin, [string]$vietnamese) {
  $ch = Normalize-Cell $chinese
  $vi = Normalize-Cell $vietnamese
  return [ordered]@{
    chinese = $ch
    pinyin = (Normalize-Cell $pinyin)
    vietnamese = $vi
    answer = $ch
    prompt = $vi
  }
}

$data = [ordered]@{}
$lines = Get-Content $sourcePath -Encoding UTF8

# Lesson titles block: columns 30-34.
foreach ($line in $lines) {
  $cols = $line -split "`t", -1
  while ($cols.Count -lt 35) { $cols += "" }

  $lessonNumber = Get-LessonNumber $cols[30]
  if ($null -eq $lessonNumber) { continue }

  $lesson = Ensure-Lesson $data $lessonNumber
  $mainTitle = Normalize-Cell $cols[31]
  $textTitles = @(
    (Normalize-Cell $cols[32]),
    (Normalize-Cell $cols[33]),
    (Normalize-Cell $cols[34])
  ) | Where-Object { $_ }

  if ($mainTitle) {
    $lesson.title = $mainTitle
    $lesson.vietnameseTitle = ($textTitles -join " / ")
  }

  if ($textTitles.Count -gt 0) {
    $lesson.textTitles.Clear()
    foreach ($title in $textTitles) { [void]$lesson.textTitles.Add($title) }
  }
}

# Vocabulary block: columns 0-8.
$currentLesson = $null
foreach ($line in $lines) {
  $cols = $line -split "`t", -1
  while ($cols.Count -lt 35) { $cols += "" }

  $lessonNumber = Get-LessonNumber $cols[0]
  if ($null -ne $lessonNumber) { $currentLesson = $lessonNumber }

  $word = Normalize-Cell $cols[1]
  $pinyin = Normalize-Cell $cols[2]
  if ($null -eq $currentLesson -or -not $word -or $pinyin -eq "Pinyin") { continue }

  Add-Item (Ensure-Lesson $data $currentLesson) "vocabulary" ([ordered]@{
    chinese = $word
    pinyin = $pinyin
    partOfSpeech = (Normalize-Cell $cols[3])
    hanViet = (Normalize-Cell $cols[4])
    sinoVietnamese = (Normalize-Cell $cols[4])
    vietnamese = (Normalize-Cell $cols[5])
    examples = @(
      [ordered]@{
        chinese = (Normalize-Cell $cols[6])
        pinyin = (Normalize-Cell $cols[7])
        vietnamese = (Normalize-Cell $cols[8])
      }
    )
  })
}

# Paragraph/text block: columns 9-12.
$currentLesson = $null
foreach ($line in $lines) {
  $cols = $line -split "`t", -1
  while ($cols.Count -lt 35) { $cols += "" }

  $lessonNumber = Get-LessonNumber $cols[9]
  if ($null -ne $lessonNumber) { $currentLesson = $lessonNumber }

  $chinese = Normalize-Cell $cols[10]
  $pinyin = Normalize-Cell $cols[11]
  if ($null -eq $currentLesson -or -not $chinese -or $pinyin -eq "Pinyin") { continue }

  $item = [ordered]@{
    chinese = $chinese
    pinyin = $pinyin
    vietnamese = (Normalize-Cell $cols[12])
  }
  Add-Item (Ensure-Lesson $data $currentLesson) "paragraph" $item
  Add-Item (Ensure-Lesson $data $currentLesson) "texts" $item
}

# Grammar block: columns 13-21.
$currentLesson = $null
foreach ($line in $lines) {
  $cols = $line -split "`t", -1
  while ($cols.Count -lt 35) { $cols += "" }

  $lessonNumber = Get-LessonNumber $cols[13]
  if ($null -ne $lessonNumber) { $currentLesson = $lessonNumber }

  $pattern = Normalize-Cell $cols[14]
  $pinyin = Normalize-Cell $cols[19]
  if ($null -eq $currentLesson -or -not $pattern -or $pinyin -eq "Pinyin") { continue }

  Add-Item (Ensure-Lesson $data $currentLesson) "grammar" ([ordered]@{
    pattern = $pattern
    formula = $pattern
    meaning = (Normalize-Cell $cols[15])
    usage = (Normalize-Cell $cols[16])
    note = (Normalize-Cell $cols[17])
    example = (Normalize-Cell $cols[18])
    pinyin = $pinyin
    vietnamese = (Normalize-Cell $cols[20])
    stars = (Star-Count $cols[21])
  })
}

# Reflex/example block: columns 22-25.
$currentLesson = $null
foreach ($line in $lines) {
  $cols = $line -split "`t", -1
  while ($cols.Count -lt 35) { $cols += "" }

  $lessonNumber = Get-LessonNumber $cols[22]
  if ($null -ne $lessonNumber) { $currentLesson = $lessonNumber }

  $chinese = Normalize-Cell $cols[23]
  $pinyin = Normalize-Cell $cols[24]
  if ($null -eq $currentLesson -or -not $chinese -or $pinyin -eq "Pinyin") { continue }

  Add-Item (Ensure-Lesson $data $currentLesson) "example" (New-PracticeItem $cols[23] $cols[24] $cols[25])
}

# Structure practice block: columns 26-29.
$currentLesson = $null
foreach ($line in $lines) {
  $cols = $line -split "`t", -1
  while ($cols.Count -lt 35) { $cols += "" }

  $lessonNumber = Get-LessonNumber $cols[26]
  if ($null -ne $lessonNumber) { $currentLesson = $lessonNumber }

  $chinese = Normalize-Cell $cols[27]
  $pinyin = Normalize-Cell $cols[28]
  if ($null -eq $currentLesson -or -not $chinese -or $pinyin -eq "Pinyin") { continue }

  Add-Item (Ensure-Lesson $data $currentLesson) "structure" (New-PracticeItem $cols[27] $cols[28] $cols[29])
}

foreach ($key in $data.Keys) {
  $lesson = $data[$key]
  $outLesson = [ordered]@{
    title = $lesson.title
    vietnameseTitle = $lesson.vietnameseTitle
    textTitles = @($lesson.textTitles)
    vocabulary = @($lesson.vocabulary)
    paragraph = @($lesson.paragraph)
    texts = @($lesson.texts)
    grammar = @($lesson.grammar)
    structure = @($lesson.structure)
    example = @($lesson.example)
  }

  $outPath = Join-Path $outDir "speaking3-lesson-$key.json"
  $outLesson | ConvertTo-Json -Depth 100 | Set-Content $outPath -Encoding UTF8
}

Write-Host "Created $($data.Keys.Count) speaking3 lesson files."
