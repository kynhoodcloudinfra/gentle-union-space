import * as XLSX from 'xlsx';

export interface QuestionRow {
  question_text: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer: string;
  question_type: 'mcq' | 'text';
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
    },
    {
      question_text: 'In which year did Ilaiyaraaja receive the Padma Bhushan?',
      correct_answer: '2010',
      question_type: 'text',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sample, {
    header: ['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'question_type'],
  });
  ws['!cols'] = [
    { wch: 60 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'questions');
  XLSX.writeFile(wb, 'raaja-riddle-questions-sample.xlsx');
}
