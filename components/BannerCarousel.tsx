"use client";

import "keen-slider/keen-slider.min.css";
import { useKeenSlider } from "keen-slider/react";
import Link from "next/link";

export default function BannerCarousel() {
  const [sliderRef] = useKeenSlider<HTMLDivElement>({
    loop: true,
    mode: "snap",
    slides: { perView: 1 },
  });

  const banners = [
    {
      href: "/simulador",
      src: "/banners/banner1.jpg",
      alt: "Simule agora",
    },
    {
      href: "/saiba-mais",
      src: "/banners/banner2.jpg",
      alt: "Saiba mais",
    },
  ];

  return (
    <section className="w-full bg-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div
          ref={sliderRef}
          className="keen-slider rounded-2xl shadow-lg overflow-hidden"
        >
          {banners.map((banner, idx) => (
            <Link
              href={banner.href}
              key={idx}
              className="keen-slider__slide flex items-center justify-center"
              tabIndex={0}
            >
              <img
                src={banner.src}
                alt={banner.alt}
                className="w-full h-[220px] md:h-[330px] object-cover transition-all duration-200"
                draggable={false}
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
