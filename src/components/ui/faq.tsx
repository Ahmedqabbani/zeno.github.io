import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqData = [
  {
    question: 'How accurate is the Figma to Code conversion?',
    answer: 'Our compiler engine uses exact layout coordinates and native styling to ensure pixel-perfect conversion without relying on hallucinating AI.'
  },
  {
    question: 'Can I export to both React and HTML?',
    answer: 'Yes, you can easily toggle between React (JSX) and raw HTML output depending on your project needs.'
  },
  {
    question: 'Do I need a paid Figma account?',
    answer: 'No, you just need a Figma Personal Access Token (PAT) which is available on all Figma account tiers.'
  },
  {
    question: 'Is my data secure?',
    answer: 'We only access the specific Figma node you provide via the URL, and we do not store your design data or tokens permanently.'
  }
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleOpen = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-24 px-6">
      <h2 className="text-3xl font-bold mb-12 text-center bg-clip-text text-transparent bg-gradient-to-b from-white to-[#888]">
        Frequently Asked Questions
      </h2>
      <div className="flex flex-col gap-2">
        {faqData.map((item, index) => (
          <div key={index} className="border-b border-[#222] last:border-b-0 pb-2">
            <button
              onClick={() => toggleOpen(index)}
              className="w-full flex justify-between items-center py-4 text-left hover:text-white text-[#EAEAEA] transition-colors focus:outline-none"
            >
              <span className="font-medium text-[15px]">{item.question}</span>
              <ChevronDown 
                className={`transform transition-transform duration-300 text-[#888] ${openIndex === index ? 'rotate-180' : ''}`} 
                size={18} 
              />
            </button>
            <div 
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                openIndex === index ? 'max-h-40 opacity-100 mb-4' : 'max-h-0 opacity-0'
              }`}
            >
              <p className="text-[#888] text-[14px] leading-relaxed">
                {item.answer}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
