$ErrorActionPreference = "Stop"

$appRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = "C:\Users\Admin\.codex\attachments\58db1236-b554-4587-a419-f55d2ef6bb89\pasted-text.txt"
$outPath = Join-Path $appRoot "data\hanyu5-lessons.json"

function Normalize-Cell([string]$value) {
  if ($null -eq $value) { return "" }
  return ($value -replace [char]0xFEFF, "").Trim()
}

function Get-LessonNumber([string]$value) {
  $text = Normalize-Cell $value
  if ($text -match "bài\s*(\d+)") { return [int]$Matches[1] }
  return $null
}

function Get-LessonTitle([string]$value) {
  $text = Normalize-Cell $value
  $match = [regex]::Match($text, "^bài\s*\d+[:：]?\s*(.*)$")
  if ($match.Success) { return (Normalize-Cell $match.Groups[1].Value) }
  return ""
}

function Star-Count([string]$value) {
  $text = Normalize-Cell $value
  if ([string]::IsNullOrWhiteSpace($text)) { return 0 }
  return ([regex]::Matches($text, [regex]::Escape("⭐"))).Count
}

function Ensure-Lesson($data, [int]$lessonNumber, [string]$title) {
  $key = [string]$lessonNumber
  if (-not ($data.PSObject.Properties.Name -contains $key)) {
    $lessonTitle = if ($title) { $title } else { "Bài $lessonNumber" }
    $data | Add-Member -MemberType NoteProperty -Name $key -Value ([pscustomobject]@{
      title = $lessonTitle
      vocabulary = @()
      paragraph = @()
      texts = @()
      grammar = @()
      structure = @()
      example = @()
    })
  } elseif ($title) {
    $data.$key.title = $title
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

function New-PracticeItem([string]$chinese, [string]$pinyin, [string]$vietnamese) {
  $ch = Normalize-Cell $chinese
  $vi = Normalize-Cell $vietnamese
  return [pscustomobject]@{
    chinese = $ch
    pinyin = (Normalize-Cell $pinyin)
    vietnamese = $vi
    answer = $ch
    prompt = $vi
  }
}

$data = [pscustomobject]@{}
$lines = Get-Content $sourcePath -Encoding UTF8

$vocabLesson = $null
$paragraphLesson = $null
$grammarLesson = $null
$exampleLesson = $null
$structureLesson = $null
$section = $null

foreach ($line in $lines) {
  $cols = $line -split "`t", -1
  while ($cols.Count -lt 28) { $cols += "" }

  $lessonFromVocab = Get-LessonNumber $cols[0]
  if ($null -ne $lessonFromVocab) {
    $vocabLesson = $lessonFromVocab
    Ensure-Lesson $data $vocabLesson (Get-LessonTitle $cols[0]) | Out-Null
  }

  $word = Normalize-Cell $cols[1]
  if ($null -ne $vocabLesson -and $word -and $word -ne "Chữ Hán") {
    Add-Item (Ensure-Lesson $data $vocabLesson "") "vocabulary" ([pscustomobject]@{
      chinese = $word
      pinyin = (Normalize-Cell $cols[2])
      partOfSpeech = (Normalize-Cell $cols[3])
      hanViet = (Normalize-Cell $cols[4])
      vietnamese = (Normalize-Cell $cols[5])
      examples = @(
        [pscustomobject]@{
          chinese = (Normalize-Cell $cols[6])
          pinyin = (Normalize-Cell $cols[7])
          vietnamese = (Normalize-Cell $cols[8])
        }
      )
    })
  }

  $newParagraphLesson = Get-LessonNumber $cols[9]
  if ($null -ne $newParagraphLesson) {
    if ($null -ne $section -and $null -ne $paragraphLesson) {
      Add-Item (Ensure-Lesson $data $paragraphLesson "") "paragraph" $section
    }
    $paragraphLesson = $newParagraphLesson
    Ensure-Lesson $data $paragraphLesson "" | Out-Null
    $section = $null
  }

  $paragraphChinese = Normalize-Cell $cols[10]
  if ($null -ne $paragraphLesson -and $paragraphChinese -and $paragraphChinese -ne "中文") {
    if ($paragraphChinese -match "^（[一二三四五六七八九十]+）" -or $null -eq $section) {
      if ($null -ne $section) {
        Add-Item (Ensure-Lesson $data $paragraphLesson "") "paragraph" $section
      }
      $section = [pscustomobject]@{
        type = "dialogue"
        title = $paragraphChinese
        lines = @()
      }
    }
    $section.lines = @($section.lines) + ([pscustomobject]@{
      chinese = $paragraphChinese
      pinyin = (Normalize-Cell $cols[11])
      vietnamese = (Normalize-Cell $cols[12])
    })
  }

  $newGrammarLesson = Get-LessonNumber $cols[13]
  if ($null -ne $newGrammarLesson) {
    $grammarLesson = $newGrammarLesson
    Ensure-Lesson $data $grammarLesson "" | Out-Null
  }

  $pattern = Normalize-Cell $cols[14]
  if ($null -ne $grammarLesson -and $pattern -and $pattern -ne "Công thức") {
    $meaning = Normalize-Cell $cols[15]
    $usage = Normalize-Cell $cols[16]
    $note = Normalize-Cell $cols[17]
    $analysis = Normalize-Cell $cols[18]
    $starsText = Normalize-Cell $cols[19]
    Add-Item (Ensure-Lesson $data $grammarLesson "") "grammar" ([pscustomobject]@{
      type = "structure"
      title = $pattern
      pattern = $pattern
      meaning = $meaning
      usage = $usage
      note = $note
      chinese = $pattern
      pinyin = ""
      vietnamese = $meaning
      stars = (Star-Count $starsText)
      level = $starsText
      order = @((Ensure-Lesson $data $grammarLesson "").grammar).Count + 1
      examples = @(
        [pscustomobject]@{
          chinese = $analysis
          pinyin = ""
          vietnamese = ""
        }
      )
    })
  }

  $newExampleLesson = Get-LessonNumber $cols[20]
  if ($null -ne $newExampleLesson) {
    $exampleLesson = $newExampleLesson
    Ensure-Lesson $data $exampleLesson "" | Out-Null
  }

  $exampleChinese = Normalize-Cell $cols[21]
  if ($null -ne $exampleLesson -and $exampleChinese -and $exampleChinese -ne "Câu ví dụ") {
    Add-Item (Ensure-Lesson $data $exampleLesson "") "example" (New-PracticeItem $cols[21] $cols[22] $cols[23])
  }

  $newStructureLesson = Get-LessonNumber $cols[24]
  if ($null -ne $newStructureLesson) {
    $structureLesson = $newStructureLesson
    Ensure-Lesson $data $structureLesson "" | Out-Null
  }

  $structureChinese = Normalize-Cell $cols[25]
  if ($null -ne $structureLesson -and $structureChinese -and $structureChinese -ne "Câu ví dụ") {
    Add-Item (Ensure-Lesson $data $structureLesson "") "structure" (New-PracticeItem $cols[25] $cols[26] $cols[27])
  }
}

if ($null -ne $section -and $null -ne $paragraphLesson) {
  Add-Item (Ensure-Lesson $data $paragraphLesson "") "paragraph" $section
}

foreach ($lessonNumber in 1..13) {
  $lesson = Ensure-Lesson $data $lessonNumber ""
  Set-ArrayProperty $lesson "texts" @($lesson.paragraph)
}

$json = $data | ConvertTo-Json -Depth 30
[System.IO.File]::WriteAllText($outPath, $json, [System.Text.UTF8Encoding]::new($false))

foreach ($lessonNumber in 1..13) {
  $lesson = Ensure-Lesson $data $lessonNumber ""
  "{0}: vocab={1}; paragraph={2}; grammar={3}; structure={4}; example={5}" -f $lessonNumber, @($lesson.vocabulary).Count, @($lesson.paragraph).Count, @($lesson.grammar).Count, @($lesson.structure).Count, @($lesson.example).Count
}


