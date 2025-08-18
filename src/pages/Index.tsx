// Update this page (the content is just a fallback if you fail to update the page)

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ocean-50 to-primary-50">
      <div className="text-center space-y-8 max-w-4xl mx-auto px-4">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-ocean-600 to-primary-600 bg-clip-text text-transparent">
          PlasticWatch
        </h1>
        <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
          Detección de residuos plásticos en zonas costeras usando inteligencia artificial y análisis de imágenes de dron.
        </p>
        <div className="flex gap-4 justify-center">
          <a href="/auth" className="bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors">
            Acceder al Sistema
          </a>
          <button className="border border-ocean-600 text-ocean-600 px-8 py-3 rounded-lg font-semibold hover:bg-ocean-50 transition-colors">
            Conocer Más
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-card p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-primary-700 mb-3">Análisis IA</h3>
            <p className="text-neutral-600">Detección automática de plásticos con modelos de deep learning</p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-ocean-700 mb-3">Mapas Interactivos</h3>
            <p className="text-neutral-600">Visualización georreferenciada y heatmaps de contaminación</p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-success-700 mb-3">Revisión Humana</h3>
            <p className="text-neutral-600">Sistema de validación y mejora continua</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
