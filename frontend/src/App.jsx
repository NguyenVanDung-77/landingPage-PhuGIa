
import Header from "./components/Header";
import HeroBanner from "./components/HeroBanner";
import OverviewSection from "./components/OverviewSection";
import LocationSection from "./components/LocationSection";
import AmenitiesSection from "./components/AmenitiesSection";
import MasterPlanSection from "./components/MasterPlanSection";
import ZonesSection from "./components/ZonesSection";
import ProductsSection from "./components/ProductsSection";
import ConsultationPopup from "./components/ConsultationPopup";
import Footer from "./components/Footer";

import "./App.css";

function App() {
  return (
    <div className="pg-app">
      <Header />

      <main>
        <HeroBanner />

        <OverviewSection />

        <LocationSection />

        <AmenitiesSection />

        <MasterPlanSection />

        <ZonesSection />

        <ProductsSection />

        <Footer />
        
      </main>

      <ConsultationPopup />
    </div>
  );
}

export default App;
