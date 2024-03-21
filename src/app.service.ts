import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getCodewise(): string {
    return 'Hello Codewise!';
  }
}
