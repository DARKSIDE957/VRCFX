$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath "VRCFX.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "e:\VRCFX\release\win-unpacked\VRCFX.exe"
$Shortcut.WorkingDirectory = "e:\VRCFX\release\win-unpacked"
$Shortcut.IconLocation = "e:\VRCFX\release\win-unpacked\VRCFX.exe,0"
$Shortcut.Description = "VRCFX Companion"
$Shortcut.Save()
Write-Host "Created shortcut at $ShortcutPath"
