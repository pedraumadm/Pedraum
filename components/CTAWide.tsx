"use client";

import Link from "next/link";

type Props = {
  title: string;
  subtitle?: string;
  primaryText: string;
  primaryHref: string;
};

export default function CTAWide({
  title,
  subtitle,
  primaryText,
  primaryHref,
}: Props) {
  return (
    <section className="container mx-auto px-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FB8500] to-[#f59e0b] text-white p-8 md:p-12">
        <div className="max-w-3xl">
          <h3 className="text-2xl md:text-3xl font-extrabold">{title}</h3>
          {subtitle && <p className="mt-2 text-white/90">{subtitle}</p>}
          <div className="mt-6">
            <Link
              href={primaryHref}
              className="inline-block rounded-full bg-white text-[#023047] font-semibold px-6 py-3 hover:bg-white/95"
            >
              {primaryText}
            </Link>
          </div>
        </div>
        <div className="absolute right-[-60px] bottom-[-60px] h-48 w-48 bg-white/20 rounded-full blur-2xl" />
      </div>
    </section>
  );
}
