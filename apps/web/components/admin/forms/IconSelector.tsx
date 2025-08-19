'use client';

import { useState } from 'react';
import * as LucideIcons from 'lucide-react';

interface IconSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Popüler iconların listesi
const popularIcons = [
  'Info',
  'AlertCircle',
  'CheckCircle',
  'XCircle',
  'Star',
  'Heart',
  'ThumbsUp',
  'ThumbsDown',
  'Eye',
  'EyeOff',
  'Play',
  'Pause',
  'SkipForward',
  'SkipBack',
  'Volume2',
  'VolumeX',
  'Mic',
  'MicOff',
  'Camera',
  'Video',
  'Image',
  'FileText',
  'Download',
  'Upload',
  'Share',
  'Link',
  'ExternalLink',
  'Mail',
  'Phone',
  'MessageCircle',
  'Bell',
  'Settings',
  'User',
  'Users',
  'Home',
  'Search',
  'Filter',
  'SortAsc',
  'SortDesc',
  'Calendar',
  'Clock',
  'MapPin',
  'Globe',
  'Wifi',
  'Bluetooth',
  'Battery',
  'Zap',
  'Sun',
  'Moon',
  'Cloud',
  'Rain',
  'Snow',
  'Wind',
  'Thermometer',
  'Droplets',
  'Umbrella',
  'Shield',
  'Lock',
  'Unlock',
  'Key',
  'CreditCard',
  'DollarSign',
  'Euro',
  'PoundSterling',
  'ShoppingCart',
  'Gift',
  'Package',
  'Truck',
  'Plane',
  'Car',
  'Bike',
  'Walk',
  'Run',
  'Dumbbell',
  'Target',
  'Trophy',
  'Medal',
  'Award',
  'Book',
  'BookOpen',
  'GraduationCap',
  'School',
  'University',
  'Briefcase',
  'Building',
  'Factory',
  'Store',
  'ShoppingBag',
  'Tag',
  'Percent',
  'Calculator',
  'BarChart',
  'PieChart',
  'TrendingUp',
  'TrendingDown',
  'Activity',
  'Pulse',
  'HeartPulse',
  'ThermometerSun',
  'ThermometerSnowflake',
  'Droplet',
  'Flame',
  'Sparkles',
  'Zap',
  'Lightning',
  'Sunrise',
  'Sunset',
  'Moon',
  'Star',
  'Compass',
  'Navigation',
  'Map',
  'Flag',
  'Anchor',
  'Ship',
  'Anchor',
  'LifeBuoy',
  'Shield',
  'Sword',
  'Target',
  'Crosshair',
  'Aim',
  'Focus',
  'Eye',
  'Glasses',
  'Camera',
  'Video',
  'Film',
  'Music',
  'Headphones',
  'Speaker',
  'Radio',
  'Tv',
  'Monitor',
  'Smartphone',
  'Tablet',
  'Laptop',
  'Desktop',
  'Printer',
  'Scanner',
  'Keyboard',
  'Mouse',
  'Gamepad',
  'Joystick',
  'Dice',
  'Puzzle',
  'Palette',
  'Brush',
  'PenTool',
  'Type',
  'Quote',
  'Code',
  'Terminal',
  'Database',
  'Server',
  'Cpu',
  'MemoryStick',
  'HardDrive',
  'Usb',
  'SdCard',
  'Wifi',
  'Bluetooth',
  'Signal',
  'SignalHigh',
  'SignalMedium',
  'SignalLow',
  'SignalZero',
  'Battery',
  'BatteryCharging',
  'BatteryFull',
  'BatteryMedium',
  'BatteryLow',
  'BatteryWarning',
  'Power',
  'PowerOff',
  'ToggleLeft',
  'ToggleRight',
  'Switch',
  'Slider',
  'Volume',
  'Volume1',
  'Volume2',
  'VolumeX',
  'Mute',
  'Mic',
  'MicOff',
  'Mic2',
  'Video',
  'VideoOff',
  'Video2',
  'Camera',
  'CameraOff',
  'Image',
  'ImageOff',
  'File',
  'FileText',
  'FileImage',
  'FileVideo',
  'FileAudio',
  'FileArchive',
  'FileCode',
  'FileSpreadsheet',
  'FilePresentation',
  'Folder',
  'FolderOpen',
  'FolderPlus',
  'FolderMinus',
  'FolderX',
  'FolderCheck',
  'FolderSearch',
  'FolderHeart',
  'FolderGit',
  'FolderGit2',
  'FolderKanban',
  'FolderInput',
  'FolderOutput',
  'FolderTree',
  'FolderSymlink',
  'FolderArchive',
  'FolderClock',
  'FolderCog',
  'FolderKey',
  'FolderLock',
  'FolderUnlock',
  'FolderUp',
  'FolderDown',
  'FolderRight',
  'FolderLeft',
  'FolderPlus2',
  'FolderMinus2',
  'FolderX2',
  'FolderCheck2',
  'FolderSearch2',
  'FolderHeart2',
  'FolderGit2',
  'FolderKanban2',
  'FolderInput2',
  'FolderOutput2',
  'FolderTree2',
  'FolderSymlink2',
  'FolderArchive2',
  'FolderClock2',
  'FolderCog2',
  'FolderKey2',
  'FolderLock2',
  'FolderUnlock2',
  'FolderUp2',
  'FolderDown2',
  'FolderRight2',
  'FolderLeft2',
];

export function IconSelector({ value, onChange, placeholder = "Icon seçiniz" }: IconSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIcons = popularIcons.filter(iconName =>
    iconName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedIcon = value ? (LucideIcons as any)[value] : null;

  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {selectedIcon ? (
            <>
              <selectedIcon className="w-4 h-4" />
              <span className="text-sm text-gray-700">{value}</span>
            </>
          ) : (
            <span className="text-sm text-gray-500">{placeholder}</span>
          )}
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Icon'u kaldır"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-80 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Icon ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-3">
            <div className="grid grid-cols-6 gap-2">
              {filteredIcons.map((iconName) => {
                const IconComponent = (LucideIcons as any)[iconName];
                if (!IconComponent) return null;

                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => {
                      onChange(iconName);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`p-2 rounded-md hover:bg-gray-100 flex flex-col items-center space-y-1 transition-colors ${
                      value === iconName ? 'bg-blue-100 border border-blue-300' : ''
                    }`}
                    title={iconName}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span className="text-xs text-gray-600 truncate w-full text-center">
                      {iconName}
                    </span>
                  </button>
                );
              })}
            </div>
            {filteredIcons.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                Icon bulunamadı
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
