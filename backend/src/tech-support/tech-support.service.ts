import {
  Inject,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { createSign } from 'crypto';
import { TechSupportQueryDto } from './dto/tech-support-query.dto';

type SortableField =
  | 'timestamp'
  | 'name'
  | 'email'
  | 'batchNo'
  | 'domain'
  | 'module'
  | 'assignedTo'
  | 'firstCallStatus'
  | 'dateOfSecondCall'
  | 'secondCallStatus';

export interface TechSupportTicket {
  rowIndex: number;
  timestamp: string;
  email: string;
  name: string;
  contactNo: string;
  batchNo: string;
  domain: string;
  module: string;
  description: string;
  audio: string;
  assignedTo: string;
  firstCallTime: string;
  firstCallStatus: string;
  firstCallRecordingLink: string;
  firstCallRemarks: string;
  dateOfSecondCall: string;
  secondCallTime: string;
  secondCallStatus: string;
  secondCallRecordingLink: string;
  secondCallRemarks: string;
}

interface GoogleSheetValuesResponse {
  values?: string[][];
}

@Injectable()
export class TechSupportService {
  private readonly rawSheetCacheKey = 'tech_support_sheet_rows';
  private accessTokenCache: { token: string; expiresAt: number } | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async findAll(query: TechSupportQueryDto) {
    const tickets = await this.getNormalizedTickets();

    const filtered = this.applyFilters(tickets, query);
    const sorted = this.applySorting(filtered, query.sortBy ?? 'timestamp', query.sortOrder ?? 'DESC');

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const data = sorted.slice(start, start + limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  private async getNormalizedTickets(): Promise<TechSupportTicket[]> {
    const cached = await this.cacheManager.get<TechSupportTicket[]>(this.rawSheetCacheKey);
    if (cached) {
      return cached;
    }

    const values = await this.fetchSheetValues();
    if (!values || values.length === 0) {
      return [];
    }

    const dataRows = this.isHeaderRow(values[0]) ? values.slice(1) : values;
    const tickets = dataRows
      .filter((row) => row.some((cell) => (cell ?? '').toString().trim() !== ''))
      .map((row, index) => this.mapRowToTicket(row, index + 2));

    await this.cacheManager.set(this.rawSheetCacheKey, tickets);
    return tickets;
  }

  private async fetchSheetValues(): Promise<string[][]> {
    const spreadsheetId = this.configService.get<string>('GOOGLE_SHEETS_SPREADSHEET_ID');
    const range = this.configService.get<string>('GOOGLE_SHEETS_RANGE');

    if (!spreadsheetId || !range) {
      throw new InternalServerErrorException('Google Sheets configuration is incomplete.');
    }

    const accessToken = await this.getGoogleAccessToken();
    const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId,
    )}/values/${encodeURIComponent(range)}`;

    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new ServiceUnavailableException(
        `Failed to fetch Tech Support sheet data from Google Sheets. ${body}`,
      );
    }

    const payload = (await response.json()) as GoogleSheetValuesResponse;
    return payload.values ?? [];
  }

  private async getGoogleAccessToken(): Promise<string> {
    if (this.accessTokenCache && this.accessTokenCache.expiresAt > Date.now() + 30_000) {
      return this.accessTokenCache.token;
    }

    const clientEmail = this.configService.get<string>('GOOGLE_SHEETS_CLIENT_EMAIL');
    const privateKeyRaw = this.configService.get<string>('GOOGLE_SHEETS_PRIVATE_KEY');

    if (!clientEmail || !privateKeyRaw) {
      throw new InternalServerErrorException('Google Sheets credentials are missing.');
    }

    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 3600;

    const assertion = this.signJwt({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: expiresAt,
      iat: now,
    }, privateKey);

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new ServiceUnavailableException(`Failed to obtain Google access token. ${body}`);
    }

    const tokenResponse = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };

    this.accessTokenCache = {
      token: tokenResponse.access_token,
      expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    };

    return tokenResponse.access_token;
  }

  private signJwt(payload: Record<string, string | number>, privateKey: string): string {
    const header = { alg: 'RS256', typ: 'JWT' };
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    const signer = createSign('RSA-SHA256');
    signer.update(unsignedToken);
    signer.end();

    const signature = signer.sign(privateKey);
    return `${unsignedToken}.${this.base64UrlEncode(signature)}`;
  }

  private base64UrlEncode(input: string | Buffer): string {
    return Buffer.from(input)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  private isHeaderRow(row: string[]): boolean {
    const firstCell = (row[0] ?? '').trim().toLowerCase();
    const secondCell = (row[1] ?? '').trim().toLowerCase();
    return firstCell === 'timestamp' && secondCell === 'email address';
  }

  private mapRowToTicket(row: string[], rowIndex: number): TechSupportTicket {
    return {
      rowIndex,
      timestamp: row[0] ?? '',
      email: row[1] ?? '',
      name: row[2] ?? '',
      contactNo: row[3] ?? '',
      batchNo: row[4] ?? '',
      domain: row[5] ?? '',
      module: row[6] ?? '',
      description: row[7] ?? '',
      audio: row[8] ?? '',
      assignedTo: row[9] ?? '',
      firstCallTime: row[10] ?? '',
      firstCallStatus: row[11] ?? '',
      firstCallRecordingLink: row[12] ?? '',
      firstCallRemarks: row[13] ?? '',
      dateOfSecondCall: row[14] ?? '',
      secondCallTime: row[15] ?? '',
      secondCallStatus: row[16] ?? '',
      secondCallRecordingLink: row[17] ?? '',
      secondCallRemarks: row[18] ?? '',
    };
  }

  private applyFilters(tickets: TechSupportTicket[], query: TechSupportQueryDto): TechSupportTicket[] {
    return tickets.filter((ticket) => {
      if (query.search) {
        const search = query.search.trim().toLowerCase();
        const haystack = [
          ticket.timestamp,
          ticket.email,
          ticket.name,
          ticket.contactNo,
          ticket.batchNo,
          ticket.domain,
          ticket.module,
          ticket.description,
          ticket.assignedTo,
          ticket.firstCallStatus,
          ticket.firstCallRemarks,
          ticket.secondCallStatus,
          ticket.secondCallRemarks,
        ]
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(search)) {
          return false;
        }
      }

      if (query.assignedTo && ticket.assignedTo.toLowerCase() !== query.assignedTo.toLowerCase()) {
        return false;
      }

      if (query.domain && ticket.domain.toLowerCase() !== query.domain.toLowerCase()) {
        return false;
      }

      if (query.batchNo && ticket.batchNo.toLowerCase() !== query.batchNo.toLowerCase()) {
        return false;
      }

      if (query.module && ticket.module.toLowerCase() !== query.module.toLowerCase()) {
        return false;
      }

      if (
        query.firstCallStatus &&
        ticket.firstCallStatus.toLowerCase() !== query.firstCallStatus.toLowerCase()
      ) {
        return false;
      }

      if (
        query.secondCallStatus &&
        ticket.secondCallStatus.toLowerCase() !== query.secondCallStatus.toLowerCase()
      ) {
        return false;
      }

      return true;
    });
  }

  private applySorting(
    tickets: TechSupportTicket[],
    sortBy: SortableField,
    sortOrder: string,
  ): TechSupportTicket[] {
    const direction = sortOrder.toUpperCase() === 'ASC' ? 1 : -1;

    return [...tickets].sort((a, b) => {
      const left = this.getComparableValue(a, sortBy);
      const right = this.getComparableValue(b, sortBy);

      if (left < right) return -1 * direction;
      if (left > right) return 1 * direction;
      return 0;
    });
  }

  private getComparableValue(ticket: TechSupportTicket, field: SortableField): number | string {
    if (field === 'timestamp') {
      return this.tryParseDate(ticket.timestamp) ?? ticket.timestamp.toLowerCase();
    }

    if (field === 'dateOfSecondCall') {
      return this.tryParseDate(ticket.dateOfSecondCall) ?? ticket.dateOfSecondCall.toLowerCase();
    }

    return (ticket[field] ?? '').toString().toLowerCase();
  }

  private tryParseDate(value: string): number | null {
    if (!value) return null;

    const cleaned = value
      .replace(/\u202f/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(' at ', ' ')
      .trim();

    const parsed = Date.parse(cleaned);
    return Number.isNaN(parsed) ? null : parsed;
  }
}
