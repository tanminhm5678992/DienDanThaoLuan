import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import os from 'os';

// ─── Config ───────────────────────────────────────────────────────────────────
const TEMP_DIR = join(os.tmpdir(), 'code-runner');
const TIME_LIMIT_MS = 10000;  // 10 giây timeout mỗi container
const MEMORY_LIMIT = '128m'; // giới hạn RAM mỗi container
const DECIMAL_PLACES = 3;

const TestCaseStatus = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    WRONG_ANSWER: 'wrong_answer',
    RUNTIME_ERROR: 'runtime_error',
    COMPILATION_ERROR: 'compilation_error',
    TIME_LIMIT_EXCEEDED: 'time_limit_exceeded',
};

// Tạo thư mục temp khi khởi động
if (!existsSync(TEMP_DIR)) mkdir(TEMP_DIR, { recursive: true });

// ─── Cấu hình từng ngôn ngữ ───────────────────────────────────────────────────
// image   : Docker image (cần pull trước — xem hướng dẫn setup bên dưới)
// filename: tên file source code
// cmd     : lệnh compile + chạy bên trong container
const LANG_CONFIG = {
    cpp: {
        image: 'gcc:latest',
        filename: 'main.cpp',
        cmd: 'g++ -o /tmp/a.out -std=c++17 /code/main.cpp && /tmp/a.out',
    },
    c: {
        image: 'gcc:latest',
        filename: 'main.c',
        cmd: 'gcc -o /tmp/a.out /code/main.c && /tmp/a.out',
    },
    python: {
        image: 'python:3.12-slim',
        filename: 'main.py',
        cmd: 'python3 /code/main.py',
    },
    java: {
        image: 'eclipse-temurin:21-jdk-jammy',
        filename: 'Main.java',
        // Java bắt buộc tên file = tên class public
        cmd: 'javac /code/Main.java -d /tmp && java -cp /tmp Main',
    },
    javascript: {
        image: 'node:20-slim',
        filename: 'main.js',
        cmd: 'node /code/main.js',
    },
    php: {
        image: 'php:8.2-cli',
        filename: 'main.php',
        cmd: 'php /code/main.php',
    },
};

// ─── Helper: xóa file tạm ─────────────────────────────────────────────────────
const cleanupFiles = async (...files) => {
    await Promise.all(files.map(f => unlink(f).catch(() => { })));
};

// ─── Helper: parse mảng field từ body ─────────────────────────────────────────
const parseArrayField = (body, ...keys) => {
    for (const key of keys) {
        if (body[key] !== undefined) {
            const val = body[key];
            return Array.isArray(val) ? val : [val];
        }
    }
    return [];
};

// ─── Phân biệt compile error vs runtime error ─────────────────────────────────
const isCompilationError = (language, stderr) => {
    if (!stderr) return false;
    const patterns = {
        cpp: /error:|undefined reference|collect2/i,
        c: /error:|undefined reference|collect2/i,
        java: /error:|cannot find symbol|';' expected/i,
    };
    return patterns[language] ? patterns[language].test(stderr) : false;
};

// ─── Chạy 1 test case trong Docker container ──────────────────────────────────
const runInDocker = (image, cmd, input) => {
    return new Promise((resolve, reject) => {
        // --rm          : tự xóa container sau khi xong
        // --network=none: chặn internet bên trong container (bảo mật)
        // --memory      : giới hạn RAM
        // --cpus=0.5    : giới hạn CPU
        // -i            : nhận stdin để truyền input
        // -v            : mount TEMP_DIR vào /code bên trong container (read-only)
        const args = [
            'run', '--rm',
            '--network=none',
            `--memory=${MEMORY_LIMIT}`,
            '--cpus=0.5',
            '-i',
            '-v', `${TEMP_DIR}:/code:ro`,
            image,
            'sh', '-c', cmd,
        ];

        const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        const startTime = performance.now();

        const timer = setTimeout(() => {
            child.kill('SIGKILL');
            reject({
                status: TestCaseStatus.TIME_LIMIT_EXCEEDED,
                error: `Vượt quá giới hạn thời gian (${TIME_LIMIT_MS / 1000}s)`,
            });
        }, TIME_LIMIT_MS);

        if (input) child.stdin.write(input);
        child.stdin.end();

        child.stdout.on('data', d => stdout += d.toString());
        child.stderr.on('data', d => stderr += d.toString());

        child.on('close', code => {
            clearTimeout(timer);
            const executionTime = ((performance.now() - startTime) / 1000).toFixed(DECIMAL_PLACES);
            if (code === 0) {
                resolve({ output: stdout.trim(), executionTime, stderr: stderr.trim() });
            } else {
                reject({
                    status: TestCaseStatus.RUNTIME_ERROR,
                    error: stderr.trim() || `Exit code: ${code}`,
                    executionTime,
                });
            }
        });

        child.on('error', err => {
            clearTimeout(timer);
            reject({
                status: TestCaseStatus.RUNTIME_ERROR,
                error: err.code === 'ENOENT'
                    ? 'Docker chưa được cài đặt trên server. Vui lòng cài Docker.'
                    : err.message,
            });
        });
    });
};

// ─── Chạy tất cả test cases tuần tự ──────────────────────────────────────────
// Chạy tuần tự (không song song) để tránh quá tải server
const runAllTestCases = async (language, langConfig, testcases) => {
    const results = [];
    for (const tc of testcases) {
        const result = { ...tc, status: TestCaseStatus.PENDING };
        try {
            const { output, executionTime, stderr } = await runInDocker(
                langConfig.image,
                langConfig.cmd,
                tc.input,
            );
            result.output = output;
            result.executionTime = executionTime;
            result.errorMessage = stderr || '';

            const expected = (tc.expected || '').trim();
            result.status = (expected === '' || output === expected)
                ? TestCaseStatus.ACCEPTED
                : TestCaseStatus.WRONG_ANSWER;
        } catch (err) {
            result.output = '';
            result.executionTime = err.executionTime || '0.000';

            // Phân loại compile error
            if (
                err.status === TestCaseStatus.RUNTIME_ERROR &&
                isCompilationError(language, err.error)
            ) {
                result.status = TestCaseStatus.COMPILATION_ERROR;
                result.errorMessage = err.error;
                // Nếu là lỗi compile thì các test case còn lại cũng lỗi giống nhau
                // Đặt tất cả test case còn lại thành COMPILATION_ERROR
                const remaining = testcases.slice(testcases.indexOf(tc) + 1).map(t => ({
                    ...t,
                    status: TestCaseStatus.COMPILATION_ERROR,
                    errorMessage: err.error,
                    output: '',
                    executionTime: '0.000',
                }));
                results.push(result, ...remaining);
                return results;
            } else {
                result.status = err.status || TestCaseStatus.RUNTIME_ERROR;
                result.errorMessage = err.error || 'Lỗi không xác định';
            }
        }
        results.push(result);
    }
    return results;
};

// ─── Controllers ──────────────────────────────────────────────────────────────
const getExecutionResult = (req, res) => {
    res.render('Code/ExecutionResult', {
        testcases: [],
        CodeContent: '',
        SelectedLanguage: 'cpp',
    });
};

const executeCode = async (req, res) => {
    const { language, sourceCode } = req.body;

    let inputs = parseArrayField(req.body, 'inputs[]', 'inputs', 'input');
    let expecteds = parseArrayField(req.body, 'expecteds[]', 'expecteds', 'expected');
    if (inputs.length === 0) inputs = [''];
    while (expecteds.length < inputs.length) expecteds.push('');

    const testcases = inputs.map((input, i) => ({
        order: i,
        input: input || '',
        expected: expecteds[i] || '',
        status: TestCaseStatus.PENDING,
        output: '',
        executionTime: null,
        errorMessage: '',
    }));

    const langConfig = LANG_CONFIG[language];
    if (!langConfig) {
        return res.render('Code/ExecutionResult', {
            testcases: testcases.map(tc => ({
                ...tc,
                status: TestCaseStatus.RUNTIME_ERROR,
                errorMessage: `Ngôn ngữ "${language}" chưa được hỗ trợ.`,
            })),
            CodeContent: sourceCode,
            SelectedLanguage: language,
        });
    }

    // Ghi source code vào TEMP_DIR (được mount vào /code trong container)
    const srcPath = join(TEMP_DIR, langConfig.filename);
    try {
        await writeFile(srcPath, sourceCode);
    } catch (err) {
        return res.render('Code/ExecutionResult', {
            testcases: testcases.map(tc => ({
                ...tc,
                status: TestCaseStatus.RUNTIME_ERROR,
                errorMessage: 'Lỗi ghi file tạm trên server.',
            })),
            CodeContent: sourceCode,
            SelectedLanguage: language,
        });
    }

    try {
        const results = await runAllTestCases(language, langConfig, testcases);
        return res.render('Code/ExecutionResult', {
            testcases: results,
            CodeContent: sourceCode,
            SelectedLanguage: language,
        });
    } catch (err) {
        console.error('executeCode error:', err);
        return res.render('Code/ExecutionResult', {
            testcases: testcases.map(tc => ({
                ...tc,
                status: TestCaseStatus.RUNTIME_ERROR,
                errorMessage: 'Lỗi máy chủ khi chạy code.',
            })),
            CodeContent: sourceCode,
            SelectedLanguage: language,
        });
    } finally {
        await cleanupFiles(srcPath);
    }
};

const executeAndDisplayHtml = (req, res) => {
    const { sourceCode, language } = req.body;
    res.render('Code/DisplayHtml', { HtmlContent: sourceCode, SelectedLanguage: language });
};

export default { getExecutionResult, executeCode, executeAndDisplayHtml };