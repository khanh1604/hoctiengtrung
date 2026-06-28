param(
  [string]$SourcePath = "C:\Users\Admin\.codex\attachments\9cc3628e-c0b7-4cf9-8e29-c60c1747b051\pasted-text.txt",
  [string]$OutputPath = ".\appTQFTC\data\hanyu4-lessons.json"
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
$currentLesson = $null

foreach ($line in ($lines | Select-Object -Skip 2)) {
  $cols = $line -split "`t", -1
  if ($cols.Count -lt 9) {
    $cols = @($cols) + @("") * (9 - $cols.Count)
  }

  $marker = Parse-LessonMarker $cols[0]
  if ($marker) {
    $currentLesson = $marker.Number
    Ensure-Lesson $lessons $currentLesson $marker.Title | Out-Null
  }

  if ($currentLesson -and $cols[1].Trim() -and -not (Is-Header $cols[1])) {
    $lesson = Ensure-Lesson $lessons $currentLesson
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
}

$json = $lessons | ConvertTo-Json -Depth 100
Set-Content -Path $OutputPath -Value $json -Encoding UTF8

Write-Host "Imported lessons:" ($lessons.Keys -join ", ")
foreach ($key in $lessons.Keys) {
  $lesson = $lessons[$key]
  Write-Host ("{0}: vocab={1}" -f $key, $lesson.vocabulary.Count)
}

