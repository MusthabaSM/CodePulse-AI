import { defineConfig } from '@prisma/config';

export default defineConfig({
  datasource: {
    url: 'postgresql://postgres:password123@db:5432/codepulse?schema=public',
  }
});
