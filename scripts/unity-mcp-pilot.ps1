param(
  [ValidateSet('Start','Status','Configure')][string]$Action = 'Status',
  [string]$UnityExe = 'C:/Program Files/Unity/Hub/Editor/6000.3.9f1/Editor/Unity.exe'
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$pilot = Join-Path $repo 'Unity/Logs/McpEditorPilot'
$install = Join-Path $repo 'tests/cikti/unity-mcp-pilot'
$server = Join-Path $install 'server-venv/Scripts/mcp-for-unity.exe'
if (!(Test-Path -LiteralPath $server) -or !(Test-Path -LiteralPath (Join-Path $pilot 'Packages/manifest.json'))) {
  throw 'Yerel pilot kurulumu bulunamadi. docs/UNITY-MCP-PILOT.md dosyasina bakin.'
}
if ($Action -eq 'Configure') {
  # Yalniz atilabilir kopyanin proje kaydi; genel istemci ayari yazilmaz.
  $config = @{mcpServers=@{UnityMCP=@{
    type='stdio'; command=$server
    args=@('--transport','stdio','--default-instance','McpEditorPilot@f75713f6')
    env=@{UNITY_MCP_DISABLE_TELEMETRY='1';MCP_DISABLE_TELEMETRY='1';DISABLE_TELEMETRY='1';UNITY_MCP_SKIP_STARTUP_CONNECT='1'}
  }}} | ConvertTo-Json -Depth 8
  $configPath = Join-Path $pilot '.mcp.json'
  if (Test-Path -LiteralPath $configPath) {
    $existing = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
    $others = @($existing.mcpServers.PSObject.Properties | Where-Object Name -ne 'UnityMCP')
    if ($others.Count -gt 0) { throw 'Baska MCP kayitlari var; uzerine yazilmadi.' }
  }
  [IO.File]::WriteAllText($configPath,$config,(New-Object Text.UTF8Encoding($false)))
  Write-Output "Proje kaydi: $configPath"
  return
}
$editors = @(Get-CimInstance Win32_Process -Filter "Name='Unity.exe'" | Where-Object {
  $_.CommandLine -and $_.CommandLine -notmatch '-batchWorker' -and $_.CommandLine.Replace('\','/').Contains($pilot.Replace('\','/'))
})
if ($Action -eq 'Status') {
  Write-Output "Pilot: $pilot"
  Write-Output "Editor sayisi: $($editors.Count)"
  Write-Output "Claude proje kaydi: $(Test-Path -LiteralPath (Join-Path $pilot '.mcp.json'))"
  return
}
if ($editors.Count -gt 0) { Write-Output 'Pilot Editor zaten calisiyor.'; return }
if (!(Test-Path -LiteralPath $UnityExe)) { throw "Unity bulunamadi: $UnityExe" }
$telemetryKeys = @('UNITY_MCP_DISABLE_TELEMETRY','MCP_DISABLE_TELEMETRY','DISABLE_TELEMETRY')
$previous = @{}
try {
  foreach ($key in $telemetryKeys) { $previous[$key]=[Environment]::GetEnvironmentVariable($key,'Process'); [Environment]::SetEnvironmentVariable($key,'1','Process') }
  $log = Join-Path $repo 'Unity/Logs/unity-mcp-pilot-editor.log'
  $arguments = '-batchmode -projectPath "{0}" -executeMethod MCPForUnity.Editor.McpCiBoot.StartStdioForCi -logFile "{1}"' -f $pilot,$log
  $process = Start-Process -FilePath $UnityExe -ArgumentList $arguments -WindowStyle Hidden -PassThru
  Write-Output "Pilot baslatildi: PID $($process.Id). Hazirlik logu: $log"
} finally {
  foreach ($key in $telemetryKeys) { [Environment]::SetEnvironmentVariable($key,$previous[$key],'Process') }
}
