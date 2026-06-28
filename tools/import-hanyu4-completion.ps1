$ErrorActionPreference = "Stop"

$appRoot = Split-Path -Parent $PSScriptRoot
$dataPath = Join-Path $appRoot "data\hanyu4-lessons.json"
$paragraphGrammarPath = "C:\Users\Admin\.codex\attachments\69ef8c65-ed06-4809-a3a2-225f85250244\pasted-text.txt"
$practicePath = "C:\Users\Admin\.codex\attachments\bebdd065-a383-4fbe-ab06-bd0695ae2938\pasted-text.txt"

function Normalize-Cell([string]$value) {
  if ($null -eq $value) { return "" }
  return ($value -replace [char]0xFEFF, "").Trim()
}

function Get-LessonNumber([string]$value) {
  $text = Normalize-Cell $value
  if ($text -match "bài\s*(\d+)") { return [int]$Matches[1] }
  return $null
}

function Ensure-Lesson($data, [int]$lessonNumber) {
  $key = [string]$lessonNumber
  if (-not ($data.PSObject.Properties.Name -contains $key)) {
    $data | Add-Member -NotePropertyName $key -NotePropertyValue ([pscustomobject]@{
      title = "Bài $lessonNumber"
      vocabulary = @()
      paragraph = @()
      texts = @()
      grammar = @()
      structure = @()
      example = @()
    })
  }
  return $data.$key
}

function Set-ArrayProperty($object, [string]$name, $items) {
  if ($object.PSObject.Properties.Name -contains $name) {
    $object.$name = @($items)
  } else {
    $object | Add-Member -NotePropertyName $name -NotePropertyValue @($items)
  }
}

function Add-Item($object, [string]$name, $item) {
  $current = @()
  if ($object.PSObject.Properties.Name -contains $name -and $null -ne $object.$name) {
    $current = @($object.$name)
  }
  Set-ArrayProperty $object $name ($current + $item)
}

function Star-Count([string]$value) {
  $text = Normalize-Cell $value
  if ([string]::IsNullOrWhiteSpace($text)) { return 0 }
  return ([regex]::Matches($text, [regex]::Escape("⭐"))).Count
}

function New-PracticeItem([string]$chinese, [string]$pinyin, [string]$vietnamese) {
  return [pscustomobject]@{
    chinese = (Normalize-Cell $chinese)
    pinyin = (Normalize-Cell $pinyin)
    vietnamese = (Normalize-Cell $vietnamese)
    answer = (Normalize-Cell $chinese)
    prompt = (Normalize-Cell $vietnamese)
  }
}

$data = Get-Content $dataPath -Raw -Encoding UTF8 | ConvertFrom-Json

foreach ($lessonNumber in 11..20) {
  $lesson = Ensure-Lesson $data $lessonNumber
  foreach ($prop in @("paragraph", "texts", "grammar", "structure", "example")) {
    Set-ArrayProperty $lesson $prop @()
  }
}

# Paragraph and grammar
$lines = Get-Content $paragraphGrammarPath -Encoding UTF8
$paragraphLesson = $null
$grammarLesson = $null
$section = $null

foreach ($line in $lines) {
  $cols = $line -split "`t", -1
  while ($cols.Count -lt 11) { $cols += "" }

  $leftLesson = Get-LessonNumber $cols[0]
  if ($null -ne $leftLesson) {
    if ($null -ne $section -and $null -ne $paragraphLesson) {
      Add-Item (Ensure-Lesson $data $paragraphLesson) "paragraph" $section
    }
    $paragraphLesson = $leftLesson
    $section = $null
  }

  $chinese = Normalize-Cell $cols[1]
  $pinyin = Normalize-Cell $cols[2]
  $vietnamese = Normalize-Cell $cols[3]
  if ($null -ne $paragraphLesson -and $chinese -and $chinese -ne "中文") {
    if ($chinese -match "^（[一二三四五六七八九十]+）" -or $null -eq $section) {
      if ($null -ne $section) {
        Add-Item (Ensure-Lesson $data $paragraphLesson) "paragraph" $section
      }
      $section = [pscustomobject]@{
        type = "dialogue"
        title = $chinese
        lines = @()
      }
    }

    $section.lines = @($section.lines) + ([pscustomobject]@{
      chinese = $chinese
      pinyin = $pinyin
      vietnamese = $vietnamese
    })
  }

  $rightLesson = Get-LessonNumber $cols[4]
  if ($null -ne $rightLesson) {
    $grammarLesson = $rightLesson
  }

  $pattern = Normalize-Cell $cols[5]
  if ($null -ne $grammarLesson -and $pattern -and $pattern -ne "Công thức") {
    $meaning = Normalize-Cell $cols[6]
    $usage = Normalize-Cell $cols[7]
    $note = Normalize-Cell $cols[8]
    $analysis = Normalize-Cell $cols[9]
    $starsText = Normalize-Cell $cols[10]
    $stars = Star-Count $starsText
    Add-Item (Ensure-Lesson $data $grammarLesson) "grammar" ([pscustomobject]@{
      type = "structure"
      title = $pattern
      pattern = $pattern
      meaning = $meaning
      usage = $usage
      note = $note
      chinese = $pattern
      pinyin = ""
      vietnamese = $meaning
      stars = $stars
      level = $starsText
      order = @((Ensure-Lesson $data $grammarLesson).grammar).Count + 1
      examples = @(
        [pscustomobject]@{
          chinese = $analysis
          pinyin = ""
          vietnamese = ""
        }
      )
    })
  }
}

if ($null -ne $section -and $null -ne $paragraphLesson) {
  Add-Item (Ensure-Lesson $data $paragraphLesson) "paragraph" $section
}

foreach ($lessonNumber in 11..20) {
  $lesson = Ensure-Lesson $data $lessonNumber
  Set-ArrayProperty $lesson "texts" @($lesson.paragraph)
}

# Reflex and structure practice
$lines = Get-Content $practicePath -Encoding UTF8
$exampleLesson = $null
$structureLesson = $null

foreach ($line in $lines) {
  $cols = $line -split "`t", -1
  while ($cols.Count -lt 8) { $cols += "" }

  $leftLesson = Get-LessonNumber $cols[0]
  $rightLesson = Get-LessonNumber $cols[4]
  if ($null -ne $leftLesson) {
    $exampleLesson = $leftLesson
  }

  $exampleChinese = Normalize-Cell $cols[1]
  if ($null -ne $exampleLesson -and $exampleChinese -and $exampleChinese -ne "Câu ví dụ") {
    Add-Item (Ensure-Lesson $data $exampleLesson) "example" (New-PracticeItem $cols[1] $cols[2] $cols[3])
  }

  if ($null -ne $rightLesson) {
    $structureLesson = $rightLesson
  }

  $structureChinese = Normalize-Cell $cols[5]
  if ($null -ne $structureLesson -and $structureChinese -and $structureChinese -ne "Câu ví dụ") {
    Add-Item (Ensure-Lesson $data $structureLesson) "structure" (New-PracticeItem $cols[5] $cols[6] $cols[7])
  }
}

$json = $data | ConvertTo-Json -Depth 30
[System.IO.File]::WriteAllText($dataPath, $json, [System.Text.UTF8Encoding]::new($false))

foreach ($lessonNumber in 11..20) {
  $lesson = Ensure-Lesson $data $lessonNumber
  "{0}: paragraph={1}; grammar={2}; structure={3}; example={4}; vocab={5}" -f $lessonNumber, @($lesson.paragraph).Count, @($lesson.grammar).Count, @($lesson.structure).Count, @($lesson.example).Count, @($lesson.vocabulary).Count
}



