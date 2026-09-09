import { useState } from 'react';
import WorkshopsPage from '@/pages/WorkshopsPage';
import RegistrationPage from '@/pages/RegistrationPage';

export default function App() {
  const [workshop, setWorkshop] = useState(null); // null = workshops list, set = registration flow

  return (
    <div className="w-full h-full bg-[#F5F1EA]">
      <div className="fixed top-0 inset-x-0 z-30 mx-auto max-w-[480px] w-full h-20 bg-[#E9E4DC] px-6 py-4 flex items-end">
        <img src="/images/logotype.svg" className="h-12" alt="بین‌ابین" />
      </div>

      {workshop
        ? <RegistrationPage workshop={workshop} onBack={() => setWorkshop(null)} />
        : <WorkshopsPage onSelectWorkshop={setWorkshop} />}

      <div className="fixed bottom-8 inset-x-0 z-20 mx-auto max-w-[480px] w-full flex justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-4 h-4"
            style={{
              backgroundColor: '#CD3A28',
              WebkitMaskImage: "url('/images/star.svg')",
              WebkitMaskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              maskImage: "url('/images/star.svg')",
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
            }}
          />
        ))}
      </div>
    </div>
  );
}
