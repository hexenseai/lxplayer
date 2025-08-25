# LXPlayer Server Status Check Script (PowerShell)
# Bu script sunucudaki mevcut durumu kontrol eder

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,
    
    [Parameter(Mandatory=$false)]
    [string]$Username = $env:USERNAME
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
}

function Write-Info($Message) {
    Write-ColorOutput Blue "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] INFO: $Message"
}

# Kullanım kontrolü
if (-not $ServerIP) {
    Write-Error "Server IP adresi gerekli!"
    Write-Host "Kullanım: .\check-server.ps1 -ServerIP <ip> [-Username <user>]"
    exit 1
}

Write-Log "LXPlayer Server Status Check başlatılıyor..."
Write-Log "Sunucu: $ServerIP"
Write-Log "Kullanıcı: $Username"

# Sunucuda durum kontrolü
$checkScript = @"
set -e

echo "=== SİSTEM DURUMU ==="
echo "Hostname: \$(hostname)"
echo "Uptime: \$(uptime)"
echo "Disk Usage:"
df -h | head -5

echo ""
echo "=== DOCKER DURUMU ==="
if command -v docker &> /dev/null; then
    echo "✅ Docker kurulu"
    echo "Docker version: \$(docker --version)"
    echo "Docker Compose version: \$(docker-compose --version)"
else
    echo "❌ Docker kurulu değil"
fi

echo ""
echo "=== PROJE DİZİNLERİ ==="
echo "Mevcut dizinler:"
ls -la /opt/ 2>/dev/null || echo "❌ /opt/ dizini bulunamadı"
ls -la ~/ 2>/dev/null | grep -E "(lxplayer|lx)" || echo "❌ ~/ dizininde lxplayer bulunamadı"

echo ""
echo "=== LXPLAYER DİZİNİ KONTROLÜ ==="

# Farklı olası dizinleri kontrol et
POSSIBLE_DIRS=("/opt/lxplayer" "~/lxplayer" "/home/$Username/lxplayer" "/var/lxplayer")

for dir in "\${POSSIBLE_DIRS[@]}"; do
    if [ -d "\$dir" ]; then
        echo "✅ Dizin bulundu: \$dir"
        echo "   İçerik:"
        ls -la "\$dir" | head -10
        
        if [ -f "\$dir/docker-compose.yml" ]; then
            echo "   ✅ docker-compose.yml bulundu"
        elif [ -f "\$dir/docker-compose.prod.yml" ]; then
            echo "   ⚠️  docker-compose.prod.yml bulundu (docker-compose.yml yok)"
        else
            echo "   ❌ Docker Compose dosyası bulunamadı"
        fi
        
        if [ -d "\$dir/.git" ]; then
            echo "   ✅ Git repository bulundu"
            echo "   Branch: \$(cd "\$dir" && git branch --show-current 2>/dev/null || echo 'unknown')"
            echo "   Son commit: \$(cd "\$dir" && git log --oneline -1 2>/dev/null || echo 'unknown')"
        else
            echo "   ❌ Git repository bulunamadı"
        fi
        
        break
    fi
done

echo ""
echo "=== DOCKER CONTAINER DURUMU ==="
if command -v docker &> /dev/null; then
    echo "Çalışan container'lar:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "❌ Docker container'ları listelenemedi"
    
    echo ""
    echo "Tüm container'lar:"
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "❌ Docker container'ları listelenemedi"
fi

echo ""
echo "=== PORT DURUMU ==="
echo "Dinlenen portlar:"
netstat -tulpn 2>/dev/null | grep -E ":(80|3000|8000|9000|9001|5433|6379|6333)" || echo "❌ İlgili portlar bulunamadı"

echo ""
echo "=== SYSTEMD SERVİSLERİ ==="
if systemctl list-units --type=service | grep -i lxplayer; then
    echo "LXPlayer systemd servisleri:"
    systemctl status lxplayer --no-pager || echo "❌ LXPlayer servisi bulunamadı"
else
    echo "❌ LXPlayer systemd servisi bulunamadı"
fi
"@

# Script'i sunucuya gönderme ve çalıştırma
Write-Log "Sunucuda durum kontrolü yapılıyor..."
$checkScript | ssh $Username@$ServerIP "cat > /tmp/check.sh && chmod +x /tmp/check.sh && /tmp/check.sh"

Write-Log "✅ Server Status Check tamamlandı!"
