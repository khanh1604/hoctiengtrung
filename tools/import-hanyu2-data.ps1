param(
  [string]$SourcePath = "C:\Users\Admin\.codex\attachments\bdb53fc0-0917-492e-b901-481a8d25b699\pasted-text.txt",
  [string]$OutputPath = ".\appTQFTC\data\hanyu2-lessons.json"
)

$ErrorActionPreference = "Stop"

function New-Lesson {
  param([string]$Title)
  [ordered]@{
    title = $Title
    vocabulary = @()
    paragraph = @()
    texts = @()
    grammar = @()
    structure = @()
    example = @()
  }
}

function Ensure-Lesson {
  param(
    $Lessons,
    [string]$Number,
    [string]$Title = ""
  )
  if (-not $Lessons.Contains($Number)) {
    $Lessons[$Number] = New-Lesson -Title ($(if ($Title) { $Title } else { "Bài $Number" }))
  } elseif ($Title -and ($Lessons[$Number].title -like "Bài *")) {
    $Lessons[$Number].title = $Title
  }
  return $Lessons[$Number]
}

function Parse-LessonMarker {
  param([string]$Text)
  $value = ""
  if ($null -ne $Text) {
    $value = $Text.Trim()
  }
  if ($value -match '^[Bb]\S*\s*(\d+)\s*:?\s*(.*)$') {
    return @{
      Number = $matches[1]
      Title = $matches[2].Trim()
    }
  }
  return $null
}

function Add-Line {
  param(
    [object[]]$Array,
    [object]$Item
  )
  return ,(@($Array) + $Item)
}

function Count-Stars {
  param([string]$Text)
  if (-not $Text) { return 0 }
  return ([regex]::Matches($Text, '⭐')).Count
}

function Is-Header {
  param([string]$Text)
  $value = ""
  if ($null -ne $Text) {
    $value = $Text.Trim()
  }
  return $value -in @("Chữ Hán", "中文", "Câu ví dụ", "Công thức", "Pinyin", "Nghĩa tiếng Việt")
}

$lines = @(Get-Content $SourcePath -Encoding UTF8)
$lessons = [ordered]@{}

$currentVocabLesson = $null
$currentParagraphLesson = $null
$currentParagraphSection = $null
$currentGrammarLesson = $null
$currentExampleLesson = $null
$currentStructureLesson = $null
foreach ($line in ($lines | Select-Object -Skip 1)) {
  $cols = $line -split "`t", -1
  if ($cols.Count -lt 28) {
    $cols = @($cols) + @("") * (28 - $cols.Count)
  }

  # Vocabulary: columns 0-8
  $vocabMarker = Parse-LessonMarker $cols[0]
  if ($vocabMarker) {
    $currentVocabLesson = $vocabMarker.Number
    Ensure-Lesson $lessons $currentVocabLesson $vocabMarker.Title | Out-Null
  }
  if ($currentVocabLesson -and $cols[1].Trim() -and -not (Is-Header $cols[1])) {
    $lesson = Ensure-Lesson $lessons $currentVocabLesson
    $lesson.vocabulary = Add-Line $lesson.vocabulary ([ordered]@{
      chinese = $cols[1].Trim()
      pinyin = $cols[2].Trim()
      partOfSpeech = $cols[3].Trim()
      hanViet = $cols[4].Trim()
      vietnamese = $cols[5].Trim()
      examples = @(
        [ordered]@{
          chinese = $cols[6].Trim()
          pinyin = $cols[7].Trim()
          vietnamese = $cols[8].Trim()
        }
      )
    })
  }

  # Paragraph/texts: columns 9-12
  $paragraphMarker = Parse-LessonMarker $cols[9]
  if ($paragraphMarker) {
    $currentParagraphLesson = $paragraphMarker.Number
    Ensure-Lesson $lessons $currentParagraphLesson | Out-Null
    $currentParagraphSection = $null
  } elseif ($cols[9].Trim() -match '^đoạn\s*\d+') {
    $lesson = Ensure-Lesson $lessons $currentParagraphLesson
    $currentParagraphSection = [ordered]@{
      type = "dialogue"
      title = $cols[10].Trim()
      lines = @()
    }
    $lesson.paragraph = Add-Line $lesson.paragraph $currentParagraphSection
  }
  if ($currentParagraphLesson -and $cols[10].Trim() -and -not (Is-Header $cols[10])) {
    $lesson = Ensure-Lesson $lessons $currentParagraphLesson
    $paragraphText = $cols[10].Trim()
    if (-not $currentParagraphSection -or (($paragraphText -match '^（[一二三四五六七八九十]+）') -and $currentParagraphSection.title -ne $paragraphText)) {
      $currentParagraphSection = [ordered]@{
        type = "dialogue"
        title = $paragraphText
        lines = @()
      }
      $lesson.paragraph = Add-Line $lesson.paragraph $currentParagraphSection
    }
    $currentParagraphSection.lines = Add-Line $currentParagraphSection.lines ([ordered]@{
      chinese = $cols[10].Trim()
      pinyin = $cols[11].Trim()
      vietnamese = $cols[12].Trim()
    })
  }

  # Grammar: columns 13-19
  $grammarMarker = Parse-LessonMarker $cols[13]
  if ($grammarMarker) {
    $currentGrammarLesson = $grammarMarker.Number
    Ensure-Lesson $lessons $currentGrammarLesson | Out-Null
  }
  if ($currentGrammarLesson -and $cols[14].Trim() -and -not (Is-Header $cols[14])) {
    $lesson = Ensure-Lesson $lessons $currentGrammarLesson
    $lesson.grammar = Add-Line $lesson.grammar ([ordered]@{
      type = "structure"
      title = $cols[14].Trim()
      pattern = $cols[14].Trim()
      meaning = $cols[15].Trim()
      usage = $cols[16].Trim()
      note = $cols[17].Trim()
      chinese = $cols[18].Trim()
      pinyin = ""
      vietnamese = $cols[15].Trim()
      stars = Count-Stars $cols[19]
      level = $cols[19].Trim()
      order = ($lesson.grammar.Count + 1)
      examples = @(
        [ordered]@{
          chinese = $cols[18].Trim()
          pinyin = ""
          vietnamese = $cols[15].Trim()
        }
      )
    })
  }

  # Reflex/example tests: columns 20-23
  $exampleMarker = Parse-LessonMarker $cols[20]
  if ($exampleMarker) {
    $currentExampleLesson = $exampleMarker.Number
    Ensure-Lesson $lessons $currentExampleLesson | Out-Null
  }
  if ($currentExampleLesson -and $cols[21].Trim() -and -not (Is-Header $cols[21])) {
    $lesson = Ensure-Lesson $lessons $currentExampleLesson
    $lesson.example = Add-Line $lesson.example ([ordered]@{
      chinese = $cols[21].Trim()
      pinyin = $cols[22].Trim()
      vietnamese = $cols[23].Trim()
      answer = $cols[21].Trim()
      prompt = $cols[23].Trim()
    })
  }

  # Structure practice: columns 24-27
  $structureMarker = Parse-LessonMarker $cols[24]
  if ($structureMarker) {
    $currentStructureLesson = $structureMarker.Number
    Ensure-Lesson $lessons $currentStructureLesson | Out-Null
  }
  if ($currentStructureLesson -and $cols[25].Trim() -and -not (Is-Header $cols[25])) {
    $lesson = Ensure-Lesson $lessons $currentStructureLesson
    $lesson.structure = Add-Line $lesson.structure ([ordered]@{
      chinese = $cols[25].Trim()
      pinyin = $cols[26].Trim()
      vietnamese = $cols[27].Trim()
      answer = $cols[25].Trim()
      prompt = $cols[27].Trim()
    })
  }
}

foreach ($key in @($lessons.Keys)) {
  $lessons[$key].texts = $lessons[$key].paragraph
}

$json = $lessons | ConvertTo-Json -Depth 100
Set-Content -Path $OutputPath -Value $json -Encoding UTF8

Write-Host "Imported lessons:" ($lessons.Keys -join ", ")
foreach ($key in $lessons.Keys) {
  $lesson = $lessons[$key]
  Write-Host ("{0}: vocab={1}, paragraph={2}, grammar={3}, structure={4}, example={5}" -f $key, $lesson.vocabulary.Count, $lesson.paragraph.Count, $lesson.grammar.Count, $lesson.structure.Count, $lesson.example.Count)
}









