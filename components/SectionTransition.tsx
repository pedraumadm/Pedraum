export default function SectionTransition() {
  return (
    <section
      className="w-full py-8 md:py-12 flex flex-col items-center justify-center bg-gradient-to-r from-[#f6f9fa] to-[#fff]"
      style={{
        borderBottomLeftRadius: "2.5rem",
        borderBottomRightRadius: "2.5rem",
        // marginBottom: "-28px", // REMOVA ESTA LINHA!
        zIndex: 1,
        position: "relative",
      }}
    >
      <h2 className="text-xl md:text-2xl font-extrabold text-[#023047] text-center mb-2">
        Pronto para negociar?
      </h2>
      <p className="text-base md:text-lg text-gray-500 text-center">
        Confira as demandas recentes publicadas na plataforma ou cadastre sua
        oferta agora mesmo!
      </p>
    </section>
  );
}
