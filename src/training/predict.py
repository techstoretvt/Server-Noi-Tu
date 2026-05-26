import os
import sys
import json
import torch
import torch.nn as nn

# Định nghĩa lại kiến trúc Model y như lúc train
class DQN(nn.Module):
    def __init__(self, vocab_size):
        super(DQN, self).__init__()
        self.embedding = nn.Embedding(vocab_size, 64)
        self.fc1 = nn.Linear(64, 128)
        self.fc2 = nn.Linear(128, 64)
        self.output_layer = nn.Linear(64, vocab_size)

    def forward(self, x):
        x = self.embedding(x)
        x = torch.relu(self.fc1(x))
        x = torch.relu(self.fc2(x))
        return self.output_layer(x)

def main():
    if len(sys.argv) < 3:
        print("ERROR: Thiếu tham số truyền vào")
        return

    tu_bat_dau = sys.argv[1].lower()
    try:
        list_word_da_dung = json.loads(sys.argv[2])
    except:
        list_word_da_dung = []

    # ------------------ ĐOẠN SỬA ĐỂ FIX LỖI ------------------
    # Lấy đường dẫn tuyệt đối của chính thư mục chứa file predict.py hiện tại (tức là thư mục /src/training/)
    current_dir = os.path.dirname(os.path.abspath(__file__))

    # Ghép nối đường dẫn chuẩn xác đến các file bổ trợ nằm cùng thư mục
    data_path = os.path.join(current_dir, 'data_for_ai.json')
    vocab_path = os.path.join(current_dir, 'vocab.json')
    model_path = os.path.join(current_dir, 'word_chain_model.pth')

    # Thay đổi các lệnh open() và torch.load() bằng các biến đường dẫn tuyệt đối vừa tạo
    with open(data_path, 'r', encoding='utf-8') as f:
        word_dict = json.load(f)
        
    with open(vocab_path, 'r', encoding='utf-8') as f:
        vocab = json.load(f)
    # --------------------------------------------------------
        
    word_to_idx = vocab["word_to_idx"]
    vocab_size = len(word_to_idx)

    if tu_bat_dau not in word_to_idx or tu_bat_dau not in word_dict:
        print("NOT_FOUND")
        return

    # Khởi động mạng nơ-ron AI và nạp file trọng số
    model = DQN(vocab_size)
    
    # SỬA TIẾP DÒNG NÀY: Dùng đường dẫn tuyệt đối để nạp model
    model.load_state_dict(torch.load(model_path))
    model.eval()

    # (Tất cả logic tính toán phía dưới giữ nguyên hoàn toàn...)
    current_idx = word_to_idx[tu_bat_dau]
    with torch.no_grad():
        q_values = model(torch.tensor([current_idx])).numpy()[0]

    valid_next_words = word_dict[tu_bat_dau]
    valid_next_words = [w for w in valid_next_words if f"{tu_bat_dau} {w}" not in list_word_da_dung and w in word_to_idx]

    if not valid_next_words:
        print("BOT_LOSE")
        return

    valid_next_words.sort(key=lambda w: q_values[word_to_idx[w]], reverse=True)
    nuoc_di_dinh_nhat = valid_next_words[0]

    print(nuoc_di_dinh_nhat)

if __name__ == "__main__":
    main()