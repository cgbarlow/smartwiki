import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create default tenant
    const defaultTenant = await prisma.tenant.upsert({
      where: { slug: 'default' },
      update: {},
      create: {
        name: 'Default Tenant',
        slug: 'default',
        isActive: true,
        maxUsers: 100,
        planType: 'free',
      },
    });

    console.log('✅ Default tenant created/updated');

    // Create default permissions
    const permissions = [
      { name: 'READ_ARTICLES', resource: 'articles', action: 'read', description: 'Read articles' },
      { name: 'WRITE_ARTICLES', resource: 'articles', action: 'write', description: 'Create and edit articles' },
      { name: 'DELETE_ARTICLES', resource: 'articles', action: 'delete', description: 'Delete articles' },
      { name: 'MANAGE_USERS', resource: 'users', action: 'manage', description: 'Manage users' },
      { name: 'MANAGE_ROLES', resource: 'roles', action: 'manage', description: 'Manage roles and permissions' },
      { name: 'MANAGE_SETTINGS', resource: 'settings', action: 'manage', description: 'Manage system settings' },
      { name: 'VIEW_ANALYTICS', resource: 'analytics', action: 'view', description: 'View analytics' },
      { name: 'MANAGE_INVITATIONS', resource: 'invitations', action: 'manage', description: 'Send and manage invitations' },
    ];

    for (const permission of permissions) {
      await prisma.permission.upsert({
        where: { name: permission.name },
        update: {},
        create: permission,
      });
    }

    console.log('✅ Permissions created/updated');

    // Create default roles
    const guestRole = await prisma.role.upsert({
      where: { name: 'GUEST' },
      update: {},
      create: {
        name: 'GUEST',
        description: 'Guest user with minimal access',
        isSystem: true,
      },
    });

    const viewerRole = await prisma.role.upsert({
      where: { name: 'VIEWER' },
      update: {},
      create: {
        name: 'VIEWER',
        description: 'Can view and read content',
        isSystem: true,
      },
    });

    const editorRole = await prisma.role.upsert({
      where: { name: 'EDITOR' },
      update: {},
      create: {
        name: 'EDITOR',
        description: 'Can view, read, and edit content',
        isSystem: true,
      },
    });

    const adminRole = await prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: {
        name: 'ADMIN',
        description: 'Full administrative access',
        isSystem: true,
      },
    });

    console.log('✅ Roles created/updated');

    // Assign permissions to roles
    const rolePermissions = [
      // Guest - no permissions (can only see public content)
      
      // Viewer - read access
      { roleId: viewerRole.id, permissionName: 'READ_ARTICLES' },
      
      // Editor - read and write access
      { roleId: editorRole.id, permissionName: 'READ_ARTICLES' },
      { roleId: editorRole.id, permissionName: 'WRITE_ARTICLES' },
      { roleId: editorRole.id, permissionName: 'VIEW_ANALYTICS' },
      
      // Admin - all permissions
      { roleId: adminRole.id, permissionName: 'READ_ARTICLES' },
      { roleId: adminRole.id, permissionName: 'WRITE_ARTICLES' },
      { roleId: adminRole.id, permissionName: 'DELETE_ARTICLES' },
      { roleId: adminRole.id, permissionName: 'MANAGE_USERS' },
      { roleId: adminRole.id, permissionName: 'MANAGE_ROLES' },
      { roleId: adminRole.id, permissionName: 'MANAGE_SETTINGS' },
      { roleId: adminRole.id, permissionName: 'VIEW_ANALYTICS' },
      { roleId: adminRole.id, permissionName: 'MANAGE_INVITATIONS' },
    ];

    for (const rolePermission of rolePermissions) {
      const permission = await prisma.permission.findFirst({
        where: { name: rolePermission.permissionName },
      });

      if (permission) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: rolePermission.roleId,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: rolePermission.roleId,
            permissionId: permission.id,
          },
        });
      }
    }

    console.log('✅ Role permissions assigned');

    // Create default admin user
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@smartwiki.com' },
      update: {},
      create: {
        email: 'admin@smartwiki.com',
        username: 'admin',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'ADMIN',
        isActive: true,
        isVerified: true,
        tenantId: defaultTenant.id,
      },
    });

    // Assign admin role to admin user
    await prisma.userRoleAssignment.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    });

    console.log('✅ Default admin user created');

    // Create demo users
    const demoUsers = [
      {
        email: 'editor@smartwiki.com',
        username: 'editor',
        firstName: 'Demo',
        lastName: 'Editor',
        role: 'EDITOR',
        roleId: editorRole.id,
      },
      {
        email: 'viewer@smartwiki.com',
        username: 'viewer',
        firstName: 'Demo',
        lastName: 'Viewer',
        role: 'VIEWER',
        roleId: viewerRole.id,
      },
    ];

    for (const userData of demoUsers) {
      const demoPassword = process.env.DEMO_PASSWORD || 'Demo123!';
      const hashedDemoPassword = await bcrypt.hash(demoPassword, 12);

      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: {
          email: userData.email,
          username: userData.username,
          password: hashedDemoPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role as any,
          isActive: true,
          isVerified: true,
          tenantId: defaultTenant.id,
        },
      });

      // Assign role to user
      await prisma.userRoleAssignment.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: userData.roleId,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: userData.roleId,
        },
      });
    }

    console.log('✅ Demo users created');

    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('Default credentials:');
    console.log('Admin: admin@smartwiki.com / Admin123!');
    console.log('Editor: editor@smartwiki.com / Demo123!');
    console.log('Viewer: viewer@smartwiki.com / Demo123!');
    console.log('');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });