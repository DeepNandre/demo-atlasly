import abstractImage from "@/assets/abstract-forms.jpg";
import topoImage from "@/assets/topo-3d.jpg";
import terrainImage from "@/assets/terrain-feature.jpg";

const Showcase = () => {
  const showcaseImages = [
    { src: abstractImage, alt: "3D terrain visualization with topographic data" },
    { src: topoImage, alt: "High-resolution elevation model with contour lines" },
    { src: terrainImage, alt: "Multi-angle site analysis rendering" }
  ];

  return (
    <section id="showcase" className="py-32 px-6 bg-muted/20">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-20 space-y-6">
          <h2 className="text-5xl md:text-6xl font-serif font-bold">
            Real Projects
          </h2>
          <p className="text-xl text-muted-foreground font-light max-w-3xl mx-auto">
            Site packs generated for projects worldwide—from urban infill to rural development.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {showcaseImages.map((image, index) => (
            <div key={index} className="relative aspect-[4/3] rounded-xl overflow-hidden group">
              <img 
                src={image.src} 
                alt={image.alt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Showcase;
