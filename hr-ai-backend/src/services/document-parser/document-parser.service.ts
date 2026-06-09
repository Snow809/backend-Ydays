import { Injectable } from '@nestjs/common';

@Injectable()
export class DocumentParserService {
  async parse(filePath: string) {
    return {
      filePath,
      text: 'Mock parsed document content.',
      note: 'PDF/DOCX parsing will be added during real document ingestion.',
    };
  }
}
