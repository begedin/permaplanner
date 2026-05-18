export type MigrateStep = (doc: Record<string, unknown>) => Record<string, unknown>;

export type MigrationModule = { default: MigrateStep };

export type MigrationLoader = () => Promise<MigrationModule>;
