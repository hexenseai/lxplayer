# LXPlayer Windows Git Update & Deploy Script
# Bu script Windows'tan Git pull ile projeyi günceller

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,
    
    [Parameter(Mandatory=$false)]
    [string]$Username = $env:USERNAME,
    
    [Parameter(Mandatory=$false)]
    [string]$Branch = "main",
    
    [Parameter(Mandatory=$false)]
    [string]$DeployDir = "/opt/lxplayer"
)

# Renk fonksiyonları
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Log($Message) {
    Write-ColorOutput Green "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
}

function Write-Warning($Message) {
    Write-ColorOutput Yellow "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] WARNING: $Message"
}

function Write-Error($Message) {
    Write-ColorOutput Red "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ERROR: $Message"
    exit 1
}

function Write-Info($Message) {
    Write-ColorOutput Blue "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] INFO: $Message"
}

# Kullanım kontrolü
if (-not $ServerIP) {
    Write-Error "Server IP adresi gerekli!"
    Write-Host "Kullanım: .\update-deploy-windows.ps1 -ServerIP <ip> [-Username <user>] [-Branch <branch>] [-DeployDir <dir>]"
    exit 1
}

Write-Log "LXPlayer Windows Git Update & Deploy başlatılıyor..."
Write-Log "Sunucu: $ServerIP"
Write-Log "Kullanıcı: $Username"
Write-Log "Branch: $Branch"
Write-Log "Deploy Directory: $DeployDir"

# SSH bağlantısını test etme
Write-Log "SSH bağlantısı test ediliyor..."
try {
    $sshTest = ssh -o ConnectTimeout=10 $Username@$ServerIP "echo 'SSH connection successful'"
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "SSH key ile bağlantı başarısız. Şifre ile bağlanmayı deneyeceğiz."
    }
} catch {
    Write-Warning "SSH key ile bağlantı başarısız. Şifre ile bağlanmayı deneyeceğiz."
}

# Sunucuda güncelleme scriptini çalıştırma
Write-Log "Sunucuda Git güncellemesi yapılıyor..."
$updateScript = @"
set -e

# Proje dizinine git
cd $DeployDir

# Git durumunu kontrol et
if [ ! -d ".git" ]; then
    echo "❌ Git repository bulunamadı! Lütfen önce projeyi clone edin."
    exit 1
fi

# Mevcut değişiklikleri stash et (eğer varsa)
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Yerel değişiklikler bulundu, stash ediliyor..."
    git stash push -m "Auto stash before update $(date)"
fi

# Remote'dan güncellemeleri çek
echo "📥 Remote'dan güncellemeler çekiliyor..."
git fetch origin

# Branch'i kontrol et ve güncelle
current_branch=\$(git branch --show-current)
if [ "\$current_branch" != "$Branch" ]; then
    echo "🔄 Branch değiştiriliyor: \$current_branch -> $Branch"
    git checkout $Branch
fi

# Remote ile senkronize et
echo "🔄 Remote ile senkronize ediliyor..."
git reset --hard origin/$Branch
git clean -fd

# Son commit bilgisini göster
echo "📋 Son commit:"
git log --oneline -1

# Environment dosyası kontrolü
if [ ! -f ".env" ]; then
    if [ -f "env.production.template" ]; then
        echo "⚠️  Environment dosyası oluşturuluyor..."
        cp env.production.template .env
        echo "⚠️  Lütfen .env dosyasını production ayarlarınızla güncelleyin!"
    fi
fi

# Docker Compose dosyası kontrolü
if [ ! -f "docker-compose.yml" ]; then
    if [ -f "docker-compose.prod.yml" ]; then
        echo "📄 Docker Compose dosyası kopyalanıyor..."
        cp docker-compose.prod.yml docker-compose.yml
    fi
fi

# Mevcut servisleri durdur
echo "🛑 Mevcut servisler durduruluyor..."
docker-compose down || true

# Docker image'larını yeniden build et
echo "🔨 Docker image'ları build ediliyor..."
docker-compose build --no-cache

# Servisleri başlat
echo "🚀 Servisler başlatılıyor..."
docker-compose up -d

# Health check
echo "🏥 Health check yapılıyor..."
sleep 10

# Servis durumunu kontrol et
if docker-compose ps | grep -q "Up"; then
    echo "✅ Güncelleme başarılı!"
    echo ""
    echo "📊 Servis durumu:"
    docker-compose ps
else
    echo "❌ Güncelleme başarısız! Logları kontrol edin."
    docker-compose logs --tail=50
    exit 1
fi
"@

# Script'i sunucuya gönderme ve çalıştırma
Write-Log "Güncelleme scripti sunucuya gönderiliyor..."
$updateScript | ssh $Username@$ServerIP "cat > /tmp/update.sh && chmod +x /tmp/update.sh && /tmp/update.sh"

# Systemd service güncelleme (eğer varsa)
Write-Log "Systemd service kontrol ediliyor..."
$serviceCheck = ssh $Username@$ServerIP "[ -f '/etc/systemd/system/lxplayer.service' ] && echo 'exists'"
if ($serviceCheck -eq "exists") {
    Write-Log "Systemd service güncelleniyor..."
    ssh $Username@$ServerIP "sudo systemctl daemon-reload && sudo systemctl restart lxplayer"
}

Write-Log "✅ Git Update & Deploy tamamlandı!"
Write-Host ""
Write-Host "🌐 Uygulama şu adreslerde erişilebilir:"
Write-Host "   - Web: http://$ServerIP"
Write-Host "   - API: http://$ServerIP/api"
Write-Host "   - MinIO Console: http://$ServerIP/minio"
Write-Host ""
Write-Host "📊 Servis durumu kontrol etmek için:"
Write-Host "   ssh $Username@$ServerIP 'cd $DeployDir && docker-compose ps'"
Write-Host ""
Write-Host "📝 Logları görüntülemek için:"
Write-Host "   ssh $Username@$ServerIP 'cd $DeployDir && docker-compose logs -f'"
Write-Host ""
Write-Host "🔄 Hızlı güncelleme için:"
Write-Host "   .\update-deploy-windows.ps1 -ServerIP $ServerIP -Username $Username -Branch $Branch -DeployDir $DeployDir"
