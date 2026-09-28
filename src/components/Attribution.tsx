import Link from 'next/link';

/** start.gg の出典表示(API 規約 2章: 取得したコンテンツを表示する際は start.gg を表示する) */
export function Attribution({ className }: { className?: string }) {
  return (
    <p className={`attribution${className ? ` ${className}` : ''}`}>
      大会データ:{' '}
      <a href="https://www.start.gg" target="_blank" rel="noreferrer">
        start.gg
      </a>
      <span aria-hidden="true"> · </span>
      <Link href="/privacy">プライバシー</Link>
    </p>
  );
}
