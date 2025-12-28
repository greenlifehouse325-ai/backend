import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { LinkStatus, NotificationType, UserRole } from '../common/enums';

@Injectable()
export class ParentLinkService {
    private readonly logger = new Logger(ParentLinkService.name);

    constructor(private readonly supabaseService: SupabaseService) { }

    /**
     * Parent requests to link with a student by NISN
     */
    async requestLink(parentUserId: string, nisn: string) {
        const adminClient = this.supabaseService.getAdminClient();

        // Get parent profile
        const { data: parent, error: parentError } = await adminClient
            .from('parents')
            .select('*, users!inner(email)')
            .eq('user_id', parentUserId)
            .single();

        if (parentError || !parent) {
            throw new NotFoundException('Profil orang tua tidak ditemukan');
        }

        // Check if already linked
        if (parent.student_id && parent.link_status === LinkStatus.APPROVED) {
            throw new BadRequestException('Anda sudah terhubung dengan seorang siswa');
        }

        // Find student by NISN
        const { data: student, error: studentError } = await adminClient
            .from('students')
            .select('id, user_id, full_name, is_verified')
            .eq('nisn', nisn)
            .single();

        if (studentError || !student) {
            throw new NotFoundException('Siswa dengan NISN tersebut tidak ditemukan');
        }

        if (!student.is_verified) {
            throw new BadRequestException('Siswa belum terverifikasi');
        }

        // Check if another parent is already linked to this student
        const { data: existingLink } = await adminClient
            .from('parents')
            .select('id')
            .eq('student_id', student.id)
            .eq('link_status', LinkStatus.APPROVED)
            .single();

        if (existingLink) {
            throw new BadRequestException('Siswa ini sudah terhubung dengan orang tua lain');
        }

        // Update parent with link request
        const { error: updateError } = await adminClient
            .from('parents')
            .update({
                student_id: student.id,
                link_status: LinkStatus.PENDING,
                link_requested_at: new Date().toISOString(),
            })
            .eq('id', parent.id);

        if (updateError) {
            this.logger.error(`Failed to create link request: ${updateError.message}`);
            throw new BadRequestException('Gagal membuat permintaan tautan');
        }

        // Notify student
        await adminClient.from('notifications').insert({
            recipient_id: student.user_id,
            type: NotificationType.PARENT_LINK,
            title: 'Permintaan Akses Orang Tua',
            message: `${parent.full_name} (${parent.relationship}) meminta akses sebagai orang tua Anda. Silakan setujui atau tolak permintaan ini.`,
            metadata: {
                parentUserId: parentUserId,
                parentName: parent.full_name,
                relationship: parent.relationship,
                parentId: parent.id,
            },
        });

        this.logger.log(`Parent ${parentUserId} requested link to student ${student.id}`);

        return {
            message: 'Permintaan tautan berhasil dikirim. Menunggu persetujuan siswa.',
            studentName: student.full_name,
        };
    }

    /**
     * Get pending link requests for a student
     */
    async getPendingRequests(studentUserId: string) {
        const adminClient = this.supabaseService.getAdminClient();

        // Get student
        const { data: student } = await adminClient
            .from('students')
            .select('id')
            .eq('user_id', studentUserId)
            .single();

        if (!student) {
            throw new NotFoundException('Profil siswa tidak ditemukan');
        }

        // Get pending parent requests
        const { data: requests, error } = await adminClient
            .from('parents')
            .select('id, user_id, full_name, phone, relationship, link_requested_at, users!inner(email)')
            .eq('student_id', student.id)
            .eq('link_status', LinkStatus.PENDING)
            .order('link_requested_at', { ascending: false });

        if (error) {
            this.logger.error(`Failed to get pending requests: ${error.message}`);
            throw new BadRequestException('Gagal mengambil permintaan');
        }

        return requests || [];
    }

    /**
     * Student approves parent link request
     */
    async approveLink(studentUserId: string, parentId: string) {
        const adminClient = this.supabaseService.getAdminClient();

        // Get student
        const { data: student } = await adminClient
            .from('students')
            .select('id, full_name')
            .eq('user_id', studentUserId)
            .single();

        if (!student) {
            throw new NotFoundException('Profil siswa tidak ditemukan');
        }

        // Get parent request
        const { data: parent } = await adminClient
            .from('parents')
            .select('id, user_id, full_name, student_id, link_status')
            .eq('id', parentId)
            .single();

        if (!parent) {
            throw new NotFoundException('Permintaan tidak ditemukan');
        }

        if (parent.student_id !== student.id) {
            throw new BadRequestException('Permintaan ini bukan untuk Anda');
        }

        if (parent.link_status !== LinkStatus.PENDING) {
            throw new BadRequestException('Permintaan sudah diproses sebelumnya');
        }

        // Approve link
        const { error } = await adminClient
            .from('parents')
            .update({
                link_status: LinkStatus.APPROVED,
                link_approved_at: new Date().toISOString(),
            })
            .eq('id', parentId);

        if (error) {
            throw new BadRequestException('Gagal menyetujui permintaan');
        }

        // Notify parent
        await adminClient.from('notifications').insert({
            recipient_id: parent.user_id,
            type: NotificationType.SYSTEM,
            title: 'Tautan Disetujui',
            message: `${student.full_name} telah menyetujui permintaan akses Anda. Anda sekarang dapat melihat informasi anak Anda.`,
        });

        this.logger.log(`Student ${studentUserId} approved parent ${parentId}`);

        return { message: 'Tautan berhasil disetujui' };
    }

    /**
     * Student rejects parent link request
     */
    async rejectLink(studentUserId: string, parentId: string) {
        const adminClient = this.supabaseService.getAdminClient();

        // Get student
        const { data: student } = await adminClient
            .from('students')
            .select('id, full_name')
            .eq('user_id', studentUserId)
            .single();

        if (!student) {
            throw new NotFoundException('Profil siswa tidak ditemukan');
        }

        // Get parent request
        const { data: parent } = await adminClient
            .from('parents')
            .select('id, user_id, full_name, student_id, link_status')
            .eq('id', parentId)
            .single();

        if (!parent) {
            throw new NotFoundException('Permintaan tidak ditemukan');
        }

        if (parent.student_id !== student.id) {
            throw new BadRequestException('Permintaan ini bukan untuk Anda');
        }

        if (parent.link_status !== LinkStatus.PENDING) {
            throw new BadRequestException('Permintaan sudah diproses sebelumnya');
        }

        // Reject link
        const { error } = await adminClient
            .from('parents')
            .update({
                student_id: null,
                link_status: LinkStatus.REJECTED,
            })
            .eq('id', parentId);

        if (error) {
            throw new BadRequestException('Gagal menolak permintaan');
        }

        // Notify parent
        await adminClient.from('notifications').insert({
            recipient_id: parent.user_id,
            type: NotificationType.SYSTEM,
            title: 'Tautan Ditolak',
            message: `${student.full_name} menolak permintaan akses Anda.`,
        });

        this.logger.log(`Student ${studentUserId} rejected parent ${parentId}`);

        return { message: 'Tautan berhasil ditolak' };
    }

    /**
     * Get current link status for parent
     */
    async getLinkStatus(parentUserId: string) {
        const adminClient = this.supabaseService.getAdminClient();

        const { data: parent } = await adminClient
            .from('parents')
            .select('student_id, link_status, link_requested_at, link_approved_at, students(id, nisn, full_name, kelas)')
            .eq('user_id', parentUserId)
            .single();

        if (!parent) {
            throw new NotFoundException('Profil orang tua tidak ditemukan');
        }

        return {
            linked: parent.link_status === LinkStatus.APPROVED,
            status: parent.link_status,
            requestedAt: parent.link_requested_at,
            approvedAt: parent.link_approved_at,
            student: parent.students,
        };
    }
}
