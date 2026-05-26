export type ProposalImage = {
  caption: string;
  source: string;
  mime: string;
  dataUrl: string;
};

export type ProposalProject = {
  id: string;
  name: string;
  title: string;
  displayName: string;
  archive: string;
  sourceRel: string;
  markdown: string;
  rawMarkdown: string;
  images: ProposalImage[];
  fields: Record<string, string>;
  stats: {
    paragraphs: number;
    tables: number;
    images: number;
    characters: number;
    totalAmount: number;
  };
};

export type ProposalData = {
  generatedAt: string;
  projects: ProposalProject[];
};
