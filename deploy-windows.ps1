# LXPlayer Windows to Ubuntu Deployment Script
# Bu script Windows'tan Ubuntu sunucuya proje aktarımı yapar

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,
    
    [Parameter(Mandatory=$false)]
    [string]$Username = $env:USERNAME,
    
    [Parameter(Mandatory=$false)]
    [string]$GitRepo = "",
    
    [Parameter(Mandatory=$false)]
    [string]$DeployMethod = "git"  # git, rsync, scp
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

# Kullanım kontrolü
if (-not $ServerIP) {
    Write-Error "Server IP adresi gerekli!"
    Write-Host "Kullanım: .\deploy-windows.ps1 -ServerIP <ip> [-Username <user>] [-GitRepo <url>] [-DeployMethod <method>]"
    exit 1
}

Write-Log "LXPlayer Windows to Ubuntu Deployment başlatılıyor..."
Write-Log "Sunucu: $ServerIP"
Write-Log "Kullanıcı: $Username"
Write-Log "Deploy Method: $DeployMethod"

# SSH bağlantısını test etme
Write-Log "SSH bağlantısı test ediliyor..."
try {
    $sshTest = ssh -o ConnectTimeout=10 -o BatchMode=yes $Username@$ServerIP "echo 'SSH connection successful'"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "SSH bağlantısı başarısız! SSH key'inizin sunucuda olduğundan emin olun."
    }
} catch {
    Write-Error "SSH bağlantısı test edilemedi: $_"
}

# Deploy method'a göre işlem
switch ($DeployMethod.ToLower()) {
    "git" {
        if (-not $GitRepo) {
            Write-Error "Git repository URL'si gerekli!"
        }
        
        Write-Log "Git-based deployment başlatılıyor..."
        
        # Sunucuda git deployment scriptini çalıştırma
        $deployScript = @"
#!/bin/bash
set -e
DEPLOY_DIR="/opt/lxplayer"
sudo mkdir -p \$DEPLOY_DIR
sudo chown $Username:$Username \$DEPLOY_DIR

if [ -d "\$DEPLOY_DIR/.git" ]; then
    cd \$DEPLOY_DIR
    git fetch origin
    git reset --hard origin/main
    git clean -fd
else
    git clone $GitRepo \$DEPLOY_DIR
fi

if [ ! -f "\$DEPLOY_DIR/.env" ]; then
    if [ -f "\$DEPLOY_DIR/env.production.template" ]; then
        cp \$DEPLOY_DIR/env.production.template \$DEPLOY_DIR/.env
        echo "Environment dosyası oluşturuldu. Lütfen güncelleyin!"
    fi
fi

if [ ! -f "\$DEPLOY_DIR/docker-compose.yml" ]; then
    if [ -f "\$DEPLOY_DIR/docker-compose.prod.yml" ]; then
        cp \$DEPLOY_DIR/docker-compose.prod.yml \$DEPLOY_DIR/docker-compose.yml
    fi
fi

cd \$DEPLOY_DIR
docker-compose build --no-cache
docker-compose up -d
"@
        
        # Script'i sunucuya gönderme ve çalıştırma
        $deployScript | ssh $Username@$ServerIP "cat > /tmp/deploy.sh && chmod +x /tmp/deploy.sh && /tmp/deploy.sh"
    }
    
    "rsync" {
        Write-Log "Rsync ile dosya aktarımı başlatılıyor..."
        
        # Rsync komutunu oluşturma
        $rsyncCmd = "rsync -avz --exclude='node_modules' --exclude='.git' --exclude='.next' --exclude='__pycache__' --exclude='*.pyc' --exclude='.env' --exclude='.DS_Store' ./ $Username@$ServerIP:/opt/lxplayer/"
        
        Write-Log "Rsync komutu: $rsyncCmd"
        Invoke-Expression $rsyncCmd
        
        # Sunucuda deployment
        ssh $Username@$ServerIP @"
cd /opt/lxplayer
if [ ! -f ".env" ]; then
    if [ -f "env.production.template" ]; then
        cp env.production.template .env
        echo "Environment dosyası oluşturuldu. Lütfen güncelleyin!"
    fi
fi

if [ ! -f "docker-compose.yml" ]; then
    if [ -f "docker-compose.prod.yml" ]; then
        cp docker-compose.prod.yml docker-compose.yml
    fi
fi

docker-compose build --no-cache
docker-compose up -d
"@
    }
    
    "scp" {
        Write-Log "SCP ile dosya aktarımı başlatılıyor..."
        
        # Geçici dizin oluşturma
        $tempDir = "lxplayer-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        New-Item -ItemType Directory -Name $tempDir -Force | Out-Null
        
        try {
            # Dosyaları kopyalama (node_modules hariç)
            Write-Log "Dosyalar hazırlanıyor..."
            Get-ChildItem -Path "." -Exclude @("node_modules", ".git", ".next", "__pycache__", "*.pyc", ".env", ".DS_Store") | Copy-Item -Destination $tempDir -Recurse -Force
            
            # Sunucuya gönderme
            Write-Log "Dosyalar sunucuya gönderiliyor..."
            scp -r $tempDir/* $Username@$ServerIP:/opt/lxplayer/
            
            # Sunucuda deployment
            ssh $Username@$ServerIP @"
cd /opt/lxplayer
if [ ! -f ".env" ]; then
    if [ -f "env.production.template" ]; then
        cp env.production.template .env
        echo "Environment dosyası oluşturuldu. Lütfen güncelleyin!"
    fi
fi

if [ ! -f "docker-compose.yml" ]; then
    if [ -f "docker-compose.prod.yml" ]; then
        cp docker-compose.prod.yml docker-compose.yml
    fi
fi

docker-compose build --no-cache
docker-compose up -d
"@
        } finally {
            # Geçici dizini temizleme
            Remove-Item -Path $tempDir -Recurse -Force
        }
    }
    
    default {
        Write-Error "Geçersiz deploy method: $DeployMethod. Desteklenen: git, rsync, scp"
    }
}

# Health check
Write-Log "Health check yapılıyor..."
Start-Sleep -Seconds 10

# Servis durumunu kontrol etme
$status = ssh $Username@$ServerIP "cd /opt/lxplayer && docker-compose ps"
Write-Log "Servis durumu:"
Write-Host $status

Write-Log "✅ Deployment tamamlandı!"
Write-Host ""
Write-Host "🌐 Uygulama şu adreslerde erişilebilir:"
Write-Host "   - Web: http://$ServerIP"
Write-Host "   - API: http://$ServerIP/api"
Write-Host "   - MinIO Console: http://$ServerIP/minio"
Write-Host ""
Write-Host "📊 Servis durumu kontrol etmek için:"
Write-Host "   ssh $Username@$ServerIP 'cd /opt/lxplayer && docker-compose ps'"
Write-Host ""
Write-Host "📝 Logları görüntülemek için:"
Write-Host "   ssh $Username@$ServerIP 'cd /opt/lxplayer && docker-compose logs -f'"
