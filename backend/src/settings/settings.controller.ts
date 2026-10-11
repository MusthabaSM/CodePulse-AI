import { Controller, Get, Patch, Post, Delete, Body, Param, UseGuards, Req, Res, Query } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';

@Controller('api/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('organization')
  @UseGuards(ClerkAuthGuard, TenantGuard, RolesGuard)
  @Roles('admin', 'manager')
  async getOrganization(@Req() req: any) {
    const orgId = req.organizationId;
    return this.settingsService.getOrganization(orgId);
  }

  @Patch('organization')
  @UseGuards(ClerkAuthGuard, TenantGuard, RolesGuard)
  @Roles('admin', 'manager')
  async updateOrganization(@Req() req: any, @Body() body: { name?: string; industry?: string }) {
    const orgId = req.organizationId;
    return this.settingsService.updateOrganization(orgId, body.name, body.industry);
  }

  @Get('github')
  @UseGuards(ClerkAuthGuard, TenantGuard, RolesGuard)
  @Roles('admin', 'manager')
  async getGithubStatus(@Req() req: any) {
    const orgId = req.organizationId;
    return this.settingsService.getGithubStatus(orgId);
  }

  @Get('github/oauth-url')
  @UseGuards(ClerkAuthGuard, TenantGuard, RolesGuard)
  @Roles('admin', 'manager')
  async getGithubOauthUrl(@Req() req: any) {
    const orgId = req.organizationId;
    const url = this.settingsService.getGithubOauthUrl(orgId);
    return { authorizationUrl: url };
  }

  // Note: the callback is accessed by the browser during redirect, so it might not have the Clerk token in the header.
  // We use the state parameter to know the orgId.
  @Public()
  @Get('github/callback')
  async handleGithubCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: any) {
    try {
      await this.settingsService.handleGithubCallback(code, state);
      // Redirect back to frontend settings page on success
      res.redirect('http://localhost:3000/settings?github=success');
    } catch (e) {
      console.error('OAuth Callback Error:', e);
      res.redirect('http://localhost:3000/settings?github=error');
    }
  }

  @Post('github/connect')
  @UseGuards(ClerkAuthGuard, TenantGuard, RolesGuard)
  @Roles('admin', 'manager')
  async connectGithub(@Req() req: any, @Body() body: { token: string }) {
    const orgId = req.organizationId;
    await this.settingsService.connectGithub(orgId, body.token);
    return { success: true };
  }

  @Post('github/sync')
  @UseGuards(ClerkAuthGuard, TenantGuard, RolesGuard)
  @Roles('admin', 'manager')
  async syncGithub(@Req() req: any) {
    const orgId = req.organizationId;
    return this.settingsService.syncGithubRepositories(orgId);
  }

  @Delete('github')
  @UseGuards(ClerkAuthGuard, TenantGuard, RolesGuard)
  @Roles('admin', 'manager')
  async disconnectGithub(@Req() req: any) {
    const orgId = req.organizationId;
    return this.settingsService.disconnectGithub(orgId);
  }

  @Get('keys')
  @UseGuards(ClerkAuthGuard, TenantGuard, RolesGuard)
  @Roles('admin', 'manager')
  async getApiKeys(@Req() req: any) {
    const orgId = req.organizationId;
    return this.settingsService.getApiKeys(orgId);
  }

  @Post('keys')
  @UseGuards(ClerkAuthGuard, TenantGuard, RolesGuard)
  @Roles('admin', 'manager')
  async createApiKey(@Req() req: any, @Body() body: { name: string }) {
    const orgId = req.organizationId;
    return this.settingsService.generateApiKey(orgId, body.name);
  }

  @Delete('keys/:id')
  @UseGuards(ClerkAuthGuard, TenantGuard, RolesGuard)
  @Roles('admin', 'manager')
  async revokeApiKey(@Req() req: any, @Param('id') id: string) {
    const orgId = req.organizationId;
    return this.settingsService.revokeApiKey(orgId, id);
  }
}
