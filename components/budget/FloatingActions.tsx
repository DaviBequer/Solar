
import React from 'react';
import { Save, Scale, FileText } from 'lucide-react';

export const FloatingActions: React.FC = () => {
    return (
        <div className="fixed bottom-24 left-0 right-0 flex justify-center gap-4 px-6 z-40 pointer-events-none">
            <button className="pointer-events-auto w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-400 hover:text-nior-navy hover:scale-110 transition-all border border-gray-100">
                <Save size={20} />
            </button>
            <button className="pointer-events-auto w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-400 hover:text-nior-navy hover:scale-110 transition-all border border-gray-100">
                <Scale size={20} />
            </button>
            <button className="pointer-events-auto w-14 h-14 bg-nior-gold text-nior-navy rounded-full shadow-xl shadow-nior-gold/30 flex items-center justify-center hover:scale-110 transition-all border-4 border-gray-50 -mt-6">
                <FileText size={24} />
            </button>
        </div>
    );
};
