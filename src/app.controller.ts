import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  /**
   * GET /api
   * Health check endpoint (public)
   */
  @Public()
  @Get()
  getHello(): { status: string; message: string; timestamp: string } {
    return this.appService.getHello();
  }

  /**
   * GET /api/health
   * Detailed health check (public)
   */
  @Public()
  @Get('health')
  getHealth(): {
    status: string;
    uptime: number;
    timestamp: string;
    environment: string;
  } {
    return this.appService.getHealth();
  }
}
