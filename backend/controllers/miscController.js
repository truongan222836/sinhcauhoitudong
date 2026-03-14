let mockNotifications = [
    { id: 1, text: "Đề thi mới từ Giảng viên A: Kiểm tra 15p Lịch sử", time: new Date().toISOString(), isRead: false },
    { id: 2, text: "Bạn đã vượt hệ thống và đạt điểm cao bài Vật lý!", time: new Date(Date.now() - 3600*1000).toISOString(), isRead: false },
    { id: 3, text: "Hệ thống bảo trì vào lúc 12:00 ngày mai.", time: new Date(Date.now() - 86400*1000).toISOString(), isRead: true }
];

exports.getNotifications = (req, res) => {
    res.json({ success: true, data: mockNotifications });
};

exports.markRead = (req, res) => {
    const id = parseInt(req.params.id);
    const notif = mockNotifications.find(n => n.id === id);
    if (notif) {
        notif.isRead = true;
    }
    res.json({ success: true, message: "Đã đánh dấu đọc" });
};

exports.sendSupport = (req, res) => {
    const { title, content } = req.body;
    console.log(`[Support] Nhận yêu cầu hỗ trợ từ user ${req.user?.id || 'Unknown'}: ${title} - ${content}`);
    res.json({ success: true, message: "Đã gửi yêu cầu hỗ trợ thành công. Đội ngũ AQG sẽ phản hồi email của bạn sớm nhất." });
};
