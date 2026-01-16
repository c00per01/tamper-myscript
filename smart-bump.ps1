<#
.SYNOPSIS
    Smart Bump: Автоматическое обновление версии Userscript с защитой от отката.
    Реализовано по ТЗ от 22.11.2025.

.DESCRIPTION
    1. Считывает локальную версию.
    2. Считывает удаленную версию (origin/main).
    3. Выбирает MAX(Local, Remote).
    4. Делает +1 к Patch версии.
    5. Обновляет файл, коммитит и пушит.
#>

# --- КОНФИГУРАЦИЯ ---
$ErrorActionPreference = "Stop"
$TargetFile = "myscript.user.js"
$RemoteBranchRef = "origin/main"
$RegexPattern = '@version\s+(\d+\.\d+\.\d+)'

# --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

function Get-VersionFromText {
    param (
        [string]$Content,
        [string]$SourceName
    )

    if ($Content -match $RegexPattern) {
        $verStr = $Matches[1]
        # Логируем в консоль, не загрязняя поток возврата
        Write-Host "   [$SourceName] Найдена версия: $verStr" -ForegroundColor Cyan
        return $verStr
    }
    
    Write-Host "   [$SourceName] Версия не найдена (или файл пуст), принимаем за 0.0.0" -ForegroundColor DarkYellow
    return "0.0.0"
}

function Parse-Version {
    param ([string]$VerString)
    # Преобразуем строку "1.2.3" в объект System.Version для корректного сравнения (чтобы 0.10 > 0.9)
    try {
        return [version]$VerString
    }
    catch {
        Write-Error "Не удалось преобразовать версию '$VerString' в объект типа [version]."
    }
}

# --- ОСНОВНОЙ АЛГОРИТМ ---

Write-Host "`n--- ЗАПУСК SMART BUMP ---" -ForegroundColor Green

# 1. Проверка наличия файла
if (-not (Test-Path $TargetFile)) {
    Write-Error "Файл '$TargetFile' не найден в текущей директории."
}

# 2. Получение ЛОКАЛЬНОЙ версии
Write-Host "1. Чтение локального файла..."
$LocalContent = Get-Content -Path $TargetFile -Raw -Encoding UTF8
$LocalVerStr = Get-VersionFromText -Content $LocalContent -SourceName "LOCAL "

# 3. Получение УДАЛЕННОЙ версии (Remote)
Write-Host "2. Получение данных из Git ($RemoteBranchRef)..."
try {
    # Обновляем информацию об удаленных ветках (скрытно)
    git fetch origin --quiet
    
    # Читаем файл из удаленной ветки в переменную
    # 2>&1 перенаправляет поток ошибок, чтобы мы могли их поймать, если файла нет
    $RemoteContent = git show "${RemoteBranchRef}:${TargetFile}" 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        throw "Файл не найден в удаленной ветке или ошибка git."
    }
    
    # Если git show вернул массив строк, собираем в одну (на всякий случай)
    if ($RemoteContent -is [array]) { $RemoteContent = $RemoteContent -join "`n" }
    
    $RemoteVerStr = Get-VersionFromText -Content $RemoteContent -SourceName "REMOTE"
}
catch {
    Write-Host "   [REMOTE] Не удалось получить файл из origin (возможно, первый пуш). Принимаем: 0.0.0" -ForegroundColor DarkGray
    $RemoteVerStr = "0.0.0"
}

# 4. Сравнение и Выбор Базы
$vLocal  = Parse-Version $LocalVerStr
$vRemote = Parse-Version $RemoteVerStr

Write-Host "3. Сравнение версий..."
if ($vRemote -gt $vLocal) {
    $BaseVerObj = $vRemote
    Write-Host "   Remote ($vRemote) > Local ($vLocal). База для обновления: REMOTE" -ForegroundColor Magenta
} else {
    $BaseVerObj = $vLocal
    Write-Host "   Local ($vLocal) >= Remote ($vRemote). База для обновления: LOCAL" -ForegroundColor Green
}



# 5. Инкремент (Patch + 1)
# System.Version хранит части как Major.Minor.Build.Revision.
# Для формата X.Y.Z нам нужны Major, Minor и Build.
$NewMajor = $BaseVerObj.Major
$NewMinor = $BaseVerObj.Minor
# Если Build = -1 (бывает при парсинге коротких версий), ставим 0, иначе +1
$NewPatch = if ($BaseVerObj.Build -lt 0) { 1 } else { $BaseVerObj.Build + 1 }

$NewVerStr = "$NewMajor.$NewMinor.$NewPatch"
Write-Host "4. Новая версия: $NewVerStr" -ForegroundColor White -BackgroundColor DarkBlue

# 6. Обновление файла
Write-Host "5. Запись в файл..."
# Заменяем старую версию на новую. Используем Regex для точности.
# 'm' не нужен, так как мы читаем файл как одну строку (-Raw), но 's' (singleline) может пригодиться.
# Шаблон замены: сохраняем префикс "@version ", меняем цифры.
$NewFileContent = $LocalContent -replace '@version\s+\d+\.\d+\.\d+', "@version $NewVerStr"

# Проверка: если замена не произошла (например, версия не найдена в тексте), добавим её?
# Согласно ТЗ: "Если строки нет — добавить её в начало".
if ($NewFileContent -eq $LocalContent) {
    Write-Host "   Тег @version не найден для замены. Добавляем в начало файла." -ForegroundColor Yellow
    $NewFileContent = "// @version       $NewVerStr`n" + $LocalContent
}

Set-Content -Path $TargetFile -Value $NewFileContent -Encoding UTF8

# 7. Git-операции
Write-Host "6. Выполнение Git операций..."

git add $TargetFile
git commit -m "smart-bump: v$NewVerStr"
Write-Host "   Коммит создан." -ForegroundColor Gray

git push origin main
Write-Host "   Изменения отправлены в origin/main." -ForegroundColor Green

Write-Host "`n[УСПЕХ] Скрипт выполнен успешно. Версия поднята до $NewVerStr" -ForegroundColor Green