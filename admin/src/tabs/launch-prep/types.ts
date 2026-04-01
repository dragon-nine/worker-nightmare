export interface DownloadOption {
  platform: string
  width: number
  height: number
  mode: 'resize' | 'crop'  // resize=자동, crop=크로퍼로 위치 조정
}

export interface AssetGroup {
  key: string
  label: string
  desc: string
  accept: string
  maxCount: number
  storeWidth: number   // Blob에 저장되는 크기
  storeHeight: number
  prefix: string
  downloads: DownloadOption[]
  exactOnly?: boolean  // true면 정확한 크기만 허용, 크로퍼 없이 바로 업로드
  fileBaseName: string  // 저장/다운로드 시 사용할 영문 파일명 (확장자 제외)
}

export function buildGroups(gameId: string): AssetGroup[] {
  return [
    {
      key: 'icon',
      label: '앱 아이콘',
      fileBaseName: 'app_icon',
      desc: '600x600',
      accept: 'image/png',
      maxCount: 1,
      storeWidth: 600, storeHeight: 600,
      exactOnly: true,
      prefix: `launch/${gameId}/icon/`,
      downloads: [
        { platform: '토스', width: 600, height: 600, mode: 'resize' },
        { platform: 'Google Play', width: 512, height: 512, mode: 'resize' },
      ],
    },
    {
      key: 'feature',
      label: '대표 이미지',
      fileBaseName: 'feature_image',
      desc: '1932x828',
      accept: 'image/png,image/jpeg',
      maxCount: 1,
      storeWidth: 1932, storeHeight: 828,
      exactOnly: true,
      prefix: `launch/${gameId}/feature/`,
      downloads: [
        { platform: '토스', width: 1932, height: 828, mode: 'resize' },
        { platform: 'Google Play', width: 1024, height: 500, mode: 'resize' },
      ],
    },
    {
      key: 'screenshots',
      label: '스크린샷',
      fileBaseName: 'screenshot',
      desc: '636x1048',
      accept: 'image/png,image/jpeg',
      maxCount: 8,
      storeWidth: 636, storeHeight: 1048,
      prefix: `launch/${gameId}/screenshots/`,
      downloads: [],
    },
  ]
}
