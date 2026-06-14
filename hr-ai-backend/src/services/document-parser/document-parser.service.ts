import { Injectable, NotFoundException } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

@Injectable()
export class DocumentParserService {
  async parse(filePath: string) {
    if (!existsSync(filePath)) {
      throw new NotFoundException(`File not found at: ${filePath}`);
    }

    try {
      const text = await readFile(filePath, 'utf8');
      return {
        filePath,
        text: text || 'Empty document.',
        note: 'Parsed as plain text.',
      };
    } catch (error: any) {
      return {
        filePath,
        text: 'Error parsing document content.',
        note: `Failed to read: ${error.message}`,
      };
    }
  }
}

