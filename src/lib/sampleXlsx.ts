import * as XLSX from 'xlsx';

export interface QuestionRow {
  question_text: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer: string;
  question_type: 'mcq' | 'text';
  scheduled_for?: string;
  image_url?: string;
}

export function downloadSampleXlsx() {
  const sample: QuestionRow[] = [
    {
      question_text: 'Which Ilaiyaraaja film features the song "Janani Janani"?',
      option_a: 'Thaai Mookambikai',
      option_b: 'Sindhu Bhairavi',
      option_c: 'Mouna Ragam',
      option_d: 'Salangai Oli',
      correct_answer: 'A',
      question_type: 'mcq',
      scheduled_for: '2026-05-01 09:00',
      image_url: 'https://example.com/landscape-1200x900.jpg',
    },
    {
      question_text: 'In which year did Ilaiyaraaja receive the Padma Bhushan?',
      correct_answer: '2010',
      question_type: 'text',
      scheduled_for: '',
      image_url: '',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sample, {
    header: ['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'question_type', 'scheduled_for', 'image_url'],
  });
  ws['!cols'] = [
    { wch: 60 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 20 }, { wch: 40 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'questions');
  XLSX.writeFile(wb, 'raaja-riddle-questions-sample.xlsx');
}

