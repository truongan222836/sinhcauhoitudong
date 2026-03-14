const { sql, config } = require("./config/db");

async function test() {
    let transaction;
    try {
        const pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const title = "Bộ đề thi AI";
        const duration = 15;
        const createdBy = 1;
        const quizCode = "123456";

        const quizResult = await new sql.Request(transaction)
            .input('Title', sql.NVarChar, title)
            .input('MaDeThi', sql.VarChar, quizCode)
            .input('CreatedBy', sql.Int, createdBy)
            .input('Duration', sql.Int, duration || 60)
            .query(`INSERT INTO DeThi (TieuDe, MaDeThi, NguoiTaoId, ThoiGianLamBai) 
                    OUTPUT INSERTED.DeThiId 
                    VALUES (@Title, @MaDeThi, @CreatedBy, @Duration)`);

        const quizId = quizResult.recordset[0].DeThiId;

        const questions = [
            {
                type: "Trắc nghiệm",
                question: "ABC?",
                options: ["A. XYZ", "B. 123", "C. 456"],
                correctAnswer: "A. XYZ"
            }
        ];

        let order = 1;

        for (const q of questions) {
            let typeId = 1; // Mặc định là Trắc nghiệm
            if (q.type === 'Tự luận') typeId = 2;
            if (q.type === 'Điền khuyết') typeId = 3;

            const questionRequest = new sql.Request(transaction);
            const questionResult = await questionRequest
                .input('Content', sql.NVarChar, q.question)
                .input('TypeId', sql.Int, typeId)
                .input('CreatedBy_Q', sql.Int, createdBy)
                .query(`INSERT INTO CauHoi (NoiDung, LoaiId, NguoiTaoId) 
                        OUTPUT INSERTED.CauHoiId 
                        VALUES (@Content, @TypeId, @CreatedBy_Q)`);

            const questionId = questionResult.recordset[0].CauHoiId;

            await new sql.Request(transaction)
                .input('QuizId_Link', sql.Int, quizId)
                .input('QuestionId_Link', sql.Int, questionId)
                .input('ThuTu', sql.Int, order++)
                .query('INSERT INTO ChiTietDeThi (DeThiId, CauHoiId, ThuTu) VALUES (@QuizId_Link, @QuestionId_Link, @ThuTu)');

            if (q.type === 'Trắc nghiệm' && q.options) {
                const normalizedCorrect = q.correctAnswer ? q.correctAnswer.replace(/^[A-H]\. /, '') : '';
                for (const option of q.options) {
                    const normalizedOption = option.replace(/^[A-H]\. /, '');
                    await new sql.Request(transaction)
                        .input('AnswerContent', sql.NVarChar, normalizedOption)
                        .input('QuestionId_Ans', sql.Int, questionId)
                        .input('IsCorrect', sql.Bit, normalizedOption === normalizedCorrect ? 1 : 0)
                        .query('INSERT INTO DapAn (NoiDung, CauHoiId, LaDapAnDung) VALUES (@AnswerContent, @QuestionId_Ans, @IsCorrect)');
                }
            } 
        }

        await transaction.commit();
        console.log("Success with full quiz flow!");
    } catch (e) {
        if (transaction) await transaction.rollback();
        console.error("Full Test Error:", e.message);
    }
}
test();
