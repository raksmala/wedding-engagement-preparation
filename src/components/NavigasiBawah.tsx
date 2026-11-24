'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

type Tautan = { href: string; label: string };

const UTAMA: Tautan[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/vendor', label: 'Vendor' },
  { href: '/tugas', label: 'Tugas' },
  { href: '/kontribusi', label: 'Kontribusi' },
];

// Hanya halaman yang sudah ada. Share Link (Task 12) dan Pengaturan (Task 13) ditambahkan di sini
// setelah halamannya dibuat.
const LAINNYA: Tautan[] = [
  { href: '/acara', label: 'Acara' },
  { href: '/komparasi', label: 'Komparasi' },
  { href: '/pengaturan/komponen', label: 'Komponen' },
];

function aktif(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavigasiBawah() {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const lainnyaAktif = LAINNYA.some((t) => aktif(pathname, t.href));

  // Navigasi tetap terpasang di layout, jadi menu Lainnya ditutup setiap pindah halaman.
  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [pathname]);

  // Ketukan atau klik di luar menu menutupnya.
  useEffect(() => {
    function tutupDiLuar(e: PointerEvent) {
      const el = menu.current;
      if (el?.open && e.target instanceof Node && !el.contains(e.target)) el.open = false;
    }
    document.addEventListener('pointerdown', tutupDiLuar);
    return () => document.removeEventListener('pointerdown', tutupDiLuar);
  }, []);

  function tutupDenganEscape(e: React.KeyboardEvent<HTMLDetailsElement>) {
    if (e.key !== 'Escape' || !menu.current?.open) return;
    menu.current.open = false;
    menu.current.querySelector('summary')?.focus();
  }

  return (
    <nav className="navigasi-bawah" aria-label="Navigasi utama">
      <ul>
        {UTAMA.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className="tautan-navigasi"
              aria-current={aktif(pathname, t.href) ? 'page' : undefined}
            >
              {t.label}
            </Link>
          </li>
        ))}
        <li>
          <details ref={menu} className="lainnya" onKeyDown={tutupDenganEscape}>
            <summary className={lainnyaAktif ? 'aktif' : undefined}>
              Lainnya
              {lainnyaAktif && <span className="sr-saja"> (halaman ini)</span>}
            </summary>
            <ul className="menu-lainnya">
              {LAINNYA.map((t) => (
                <li key={t.href}>
                  <Link href={t.href} aria-current={aktif(pathname, t.href) ? 'page' : undefined}>
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </li>
      </ul>
    </nav>
  );
}
