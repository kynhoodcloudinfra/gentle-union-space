import * as XLSX from 'xlsx';

export interface QuestionRow {
  day_number: number;
  question_text: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer: string;
  question_type: 'mcq' | 'text';
  month: string;
}

export function downloadSampleXlsx() {
  const sample: QuestionRow[] = [
    {
      day_number: 1,
      question_text: 'Which Ilaiyaraaja film features the song "Janani Janani"?',
      option_a: 'Thaai Mookambikai',
      option_b: 'Sindhu Bhairavi',
      option_c: 'Mouna Ragam',
      option_d: 'Salangai Oli',
      correct_answer: 'A',
      question_type: 'mcq',
      month: '2026-04',
    },
    {
      day_number: 2,
      question_text: 'In which year did Ilaiyaraaja receive the Padma Bhushan?',
      correct_answer: '2010',
      question_type: 'text',
      month: '2026-04',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sample, {
    header: ['day_number', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'question_type', 'month'],
  });
  // Column widths
  ws['!cols'] = [
    { wch: 10 }, { wch: 60 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 10 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'questions');
  XLSX.writeFile(wb, 'raaja-riddle-questions-sample.xlsx');
}
