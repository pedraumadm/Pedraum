// CARROSSEL DE IMAGENS PREMIUM
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const images = [
  "/slide1.jpg",
  "/slide2.jpg",
  // Adicione mais se quiser: "/slide3.jpg"
];

export default function ImageCarousel() {
  const carouselRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    const el = carouselRef.current;
    if (!el) return;
    const scrollAmount = el.offsetWidth * 0.85;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section className="w-full py-10 bg-white flex justify-center relative">
      <div className="relative max-w-6xl w-full px-2">
        {/* Left Arrow */}
        <button
          onClick={() => scroll("left")}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/80 rounded-full shadow-lg hover:bg-white transition"
          aria-label="Anterior"
        >
          <ChevronLeft size={32} className="text-[#023047]" />
        </button>

        {/* Carrossel */}
        <div
          ref={carouselRef}
          className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory px-4 md:px-12"
          style={{ scrollbarWidth: "none" }}
        >
          {images.map((src, idx) => (
            <div
              key={idx}
              className="flex-none snap-center w-[92vw] max-w-[450px] md:max-w-[600px] h-[220px] md:h-[320px] bg-gray-100 rounded-3xl shadow-lg overflow-hidden border-2 border-white"
            >
              <img
                src={src}
                alt={`Slide ${idx + 1}`}
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll("right")}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/80 rounded-full shadow-lg hover:bg-white transition"
          aria-label="Próximo"
        >
          <ChevronRight size={32} className="text-[#023047]" />
        </button>
      </div>
    </section>
  );
}
