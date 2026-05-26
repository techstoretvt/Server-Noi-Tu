import torch
import torch.nn as nn
import json
import os

# === ĐÃ FIX CHUẨN KÍCH THƯỚC (SHAPE) THEO BỘ NÃO THỰC TẾ CỦA BẠN ===
class DQN(nn.Module):
    def __init__(self, vocab_size):
        super(DQN, self).__init__()
        # 1. Khớp với param shape [7231, 64]
        self.embedding = nn.Embedding(vocab_size, 64) 
        
        # 2. Khớp với param shape [128, 64] (Nhận vào 64, đầu ra 128)
        self.fc1 = nn.Linear(64, 128)
        
        # 3. Khớp với param shape [64, 128] và bias [64] (Nhận vào 128, đầu ra 64)
        self.fc2 = nn.Linear(128, 64)
        
        # 4. Khớp với param shape [7231, 64] (Nhận vào 64, đầu ra là toàn bộ từ vựng)
        self.output_layer = nn.Linear(64, vocab_size)
        self.relu = nn.ReLU()

    def forward(self, x):
        out = self.embedding(x)
        if out.dim() == 3:
            out = out.squeeze(1)
        out = self.relu(self.fc1(out))
        out = self.relu(self.fc2(out))
        out = self.output_layer(out)
        return out
# =====================================================================

def convert():
    # Đọc Vocab để lấy kích thước dữ liệu
    with open('vocab.json', 'r', encoding='utf-8') as f:
        vocab = json.load(f)
    vocab_size = len(vocab["word_to_idx"])

    # Khởi tạo mô hình theo cấu trúc chuẩn mới sửa
    model = DQN(vocab_size)
    
    # Nạp file .pth (Chắc chắn thành công vì cấu trúc hình học ma trận đã trùng khít)
    model.load_state_dict(torch.load('word_chain_model.pth', map_location=torch.device('cpu')))
    model.eval()

    # Tạo dữ liệu giả lập (ID của một từ)
    dummy_input = torch.tensor([0], dtype=torch.long)

    # Xuất mô hình sang định dạng ONNX
    torch.onnx.export(
        model, 
        dummy_input, 
        "word_chain_model.onnx",
        input_names=['input'], 
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}},
        opset_version=12
    )
    print("=== ĐÃ CHUYỂN ĐỔI THÀNH CÔNG SANG FILE word_chain_model.onnx ===")

if __name__ == "__main__":
    convert()