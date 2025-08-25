@echo off
setlocal enabledelayedexpansion

REM LXPlayer Windows to Ubuntu Deployment Script
REM Bu script Windows'tan Ubuntu sunucuya proje aktarımı yapar

set "SERVER_IP=%1"
set "USERNAME=%2"
set "GIT_REPO=%3"

if "%SERVER_IP%"=="" (
    echo Kullanım: deploy-windows.bat ^<sunucu-ip^> [kullanıcı-adı] [git-repo-url]
    echo Örnek: deploy-windows.bat 192.168.1.100 ubuntu https://github.com/username/lxplayer.git
    exit /b 1
)

if "%USERNAME%"=="" set "USERNAME=%USERNAME%"

echo [%date% %time%] LXPlayer Windows to Ubuntu Deployment başlatılıyor...
echo Sunucu: %SERVER_IP%
echo Kullanıcı: %USERNAME%

REM SSH bağlantısını test etme
echo [%date% %time%] SSH bağlantısı test ediliyor...
ssh -o ConnectTimeout=10 -o BatchMode=yes %USERNAME%@%SERVER_IP% "echo 'SSH connection successful'"
if %errorlevel% neq 0 (
    echo [%date% %time%] ERROR: SSH bağlantısı başarısız! SSH key'inizin sunucuda olduğundan emin olun.
    exit /b 1
)

if not "%GIT_REPO%"=="" (
    echo [%date% %time%] Git-based deployment başlatılıyor...
    
    REM Git deployment scriptini sunucuya gönderme
    ssh %USERNAME%@%SERVER_IP% "sudo mkdir -p /opt/lxplayer && sudo chown %USERNAME%:%USERNAME% /opt/lxplayer"
    
    if ssh %USERNAME%@%SERVER_IP% "[ -d '/opt/lxplayer/.git' ]" (
        echo [%date% %time%] Mevcut repository güncelleniyor...
        ssh %USERNAME%@%SERVER_IP% "cd /opt/lxplayer && git fetch origin && git reset --hard origin/main && git clean -fd"
    ) else (
        echo [%date% %time%] Repository klonlanıyor...
        ssh %USERNAME%@%SERVER_IP% "git clone %GIT_REPO% /opt/lxplayer"
    )
    
    REM Environment dosyası kontrolü
    ssh %USERNAME%@%SERVER_IP% "cd /opt/lxplayer && if [ ! -f '.env' ]; then if [ -f 'env.production.template' ]; then cp env.production.template .env; echo 'Environment dosyası oluşturuldu. Lütfen güncelleyin!'; fi; fi"
    
    REM Docker Compose dosyası kontrolü
    ssh %USERNAME%@%SERVER_IP% "cd /opt/lxplayer && if [ ! -f 'docker-compose.yml' ]; then if [ -f 'docker-compose.prod.yml' ]; then cp docker-compose.prod.yml docker-compose.yml; fi; fi"
    
    REM Docker build ve başlatma
    echo [%date% %time%] Docker image'ları build ediliyor...
    ssh %USERNAME%@%SERVER_IP% "cd /opt/lxplayer && docker-compose build --no-cache"
    
    echo [%date% %time%] Servisler başlatılıyor...
    ssh %USERNAME%@%SERVER_IP% "cd /opt/lxplayer && docker-compose up -d"
    
) else (
    echo [%date% %time%] SCP ile dosya aktarımı başlatılıyor...
    
    REM Geçici dizin oluşturma
    set "TEMP_DIR=lxplayer-deploy-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%"
    set "TEMP_DIR=%TEMP_DIR: =0%"
    mkdir "%TEMP_DIR%"
    
    REM Dosyaları kopyalama (node_modules hariç)
    echo [%date% %time%] Dosyalar hazırlanıyor...
    xcopy . "%TEMP_DIR%" /E /I /H /Y /EXCLUDE:deploy-exclude.txt
    
    REM Sunucuya gönderme
    echo [%date% %time%] Dosyalar sunucuya gönderiliyor...
    scp -r "%TEMP_DIR%\*" %USERNAME%@%SERVER_IP%:/opt/lxplayer/
    
    REM Geçici dizini temizleme
    rmdir /s /q "%TEMP_DIR%"
    
    REM Sunucuda deployment
    ssh %USERNAME%@%SERVER_IP% "cd /opt/lxplayer && if [ ! -f '.env' ]; then if [ -f 'env.production.template' ]; then cp env.production.template .env; echo 'Environment dosyası oluşturuldu. Lütfen güncelleyin!'; fi; fi"
    ssh %USERNAME%@%SERVER_IP% "cd /opt/lxplayer && if [ ! -f 'docker-compose.yml' ]; then if [ -f 'docker-compose.prod.yml' ]; then cp docker-compose.prod.yml docker-compose.yml; fi; fi"
    ssh %USERNAME%@%SERVER_IP% "cd /opt/lxplayer && docker-compose build --no-cache"
    ssh %USERNAME%@%SERVER_IP% "cd /opt/lxplayer && docker-compose up -d"
)

REM Health check
echo [%date% %time%] Health check yapılıyor...
timeout /t 10 /nobreak >nul

REM Servis durumunu kontrol etme
echo [%date% %time%] Servis durumu kontrol ediliyor...
ssh %USERNAME%@%SERVER_IP% "cd /opt/lxplayer && docker-compose ps"

echo [%date% %time%] ✅ Deployment tamamlandı!
echo.
echo 🌐 Uygulama şu adreslerde erişilebilir:
echo    - Web: http://%SERVER_IP%
echo    - API: http://%SERVER_IP%/api
echo    - MinIO Console: http://%SERVER_IP%/minio
echo.
echo 📊 Servis durumu kontrol etmek için:
echo    ssh %USERNAME%@%SERVER_IP% "cd /opt/lxplayer && docker-compose ps"
echo.
echo 📝 Logları görüntülemek için:
echo    ssh %USERNAME%@%SERVER_IP% "cd /opt/lxplayer && docker-compose logs -f"
