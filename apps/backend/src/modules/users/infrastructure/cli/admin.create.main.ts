import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Result, USER_ROLE } from '@neuma/shared';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import pino from 'pino';
import { AppModule } from '../../../../app.module';
import { buildLogOptions } from '../../../../common/infrastructure/logger.options';
import { FIRST_ADMIN_LOG_LEVEL, PASSWORD_FROM_TERMINAL_REFUSED } from '../../constants/user.constants';
import { CreateUserDto } from '../../dto/user.create.dto';
import { UsersService } from '../../users.service';
import { readFirstAdminArguments, readPasswordFromInput } from '../../utils/first-admin.utils';

const logger = pino(buildLogOptions(FIRST_ADMIN_LOG_LEVEL), pino.destination(2));

const readPassword = async (): Promise<Result<string>> => {
  if (process.stdin.isTTY) return Result.fail(new Error(PASSWORD_FROM_TERMINAL_REFUSED));
  return Result.ok(readPasswordFromInput(await Bun.stdin.text()));
};

/** The same validation the API applies to a new account, so the command cannot create one the app would refuse. */
const validateAccount = async (account: CreateUserDto): Promise<Result<CreateUserDto>> => {
  const errors = await validate(account);
  if (errors.length === 0) return Result.ok(account);
  const fields = errors.map((error) => error.property).join(', ');
  return Result.fail(new Error(`Datos inválidos en: ${fields}`));
};

const readAccount = async (): Promise<Result<CreateUserDto>> => {
  const parsed = readFirstAdminArguments(process.argv.slice(2));
  if (parsed.isFail()) return Result.fail(parsed.getError());
  const password = await readPassword();
  if (password.isFail()) return Result.fail(password.getError());
  const account = plainToInstance(CreateUserDto, {
    ...parsed.getValue(),
    password: password.getValue(),
    role: USER_ROLE.ADMIN,
  });
  return validateAccount(account);
};

const createFirstAdmin = async (account: CreateUserDto): Promise<void> => {
  const application = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const created = await application.get(UsersService).createFirstAdmin(account);
    if (created.isFail()) {
      logger.error({ code: created.getError().code }, created.getError().message);
      process.exitCode = 1;
      return;
    }
    logger.info({ userId: created.getValue().id }, 'Administrador creado: ya puede iniciar sesión en el portal');
  } finally {
    await application.close();
  }
};

export const runCreateFirstAdmin = async (): Promise<void> => {
  const account = await readAccount();
  if (account.isFail()) {
    logger.error(account.getError().message);
    process.exitCode = 1;
    return;
  }
  await createFirstAdmin(account.getValue());
};

void runCreateFirstAdmin().catch((error: unknown) => {
  logger.error({ err: error }, 'No se pudo crear el administrador');
  process.exitCode = 1;
});
