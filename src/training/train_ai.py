import os
import json
import random
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np

# 1. Đọc dữ liệu JSON đã xuất từ Node.js
with open('data_for_ai.json', 'r', encoding='utf-8') as f:
    word_dict = json.load(f)

# Tạo danh bạ từ vựng từ tất cả các từ có mặt trong file dữ liệu
all_words = sorted(list(set(list(word_dict.keys()) + [item for sublist in word_dict.values() for item in sublist])))
vocab_size = len(all_words)

word_to_idx = {word: idx for idx, word in enumerate(all_words)}
idx_to_word = {idx: word for idx, word in enumerate(all_words)}

# Lưu lại từ vựng để file predict sử dụng sau này
with open('vocab.json', 'w', encoding='utf-8') as f:
    json.dump({"word_to_idx": word_to_idx, "idx_to_word": idx_to_word}, f, ensure_ascii=False, indent=2)

# === ĐÃ SỬA: Cấu hình thiết bị chạy GPU (Tối ưu cho Mac M1/M2/M3 hoặc Card NVIDIA) ===
device = torch.device("cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu"))
print(f"🚀 AI ĐANG CHẠY TRÊN THIẾT BỊ: {device}")

# 2. Định nghĩa Mạng Nơ-ron Sâu (Deep Q-Network) bằng PyTorch
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

# Khởi tạo mô hình mạng nơ-ron và đẩy lên GPU liền
model = DQN(vocab_size).to(device)

if os.path.exists('word_chain_model.pth'):
    print("=== TÌM THẤY BỘ NÃO CŨ! AI ĐANG NẠP LẠI KINH NGHIỆM ĐỂ HỌC TIẾP... ===")
    # Thêm map_location để nạp an toàn giữa CPU và GPU
    model.load_state_dict(torch.load('word_chain_model.pth', map_location=device))
else:
    print("=== KHÔNG CÓ FILE CŨ, AI SẼ HỌC LẠI TỪ ĐẦU (RESET) ===")

# === ĐÃ SỬA: Giảm tốc độ học (Learning Rate) xuống cực thấp để tinh chỉnh bộ não cũ, không làm sập Loss về 0 ===
optimizer = optim.Adam(model.parameters(), lr=0.00001)
loss_fn = nn.HuberLoss()

# 3. Quá trình Tự đấu (Self-Play Simulation) và Tự học
def train_ai(episodes=500000):
    gamma = 0.97
    
    # === ĐÃ SỬA: Chỉnh lại Epsilon dốc giảm chậm để ép AI liên tục tìm nước đi độc lạ, phá thế đóng băng Loss ===
    epsilon_start = 0.50  # Bắt đầu với 50% đi ngẫu nhiên để mở rộng vốn chiến thuật
    epsilon_min = 0.05    # Giữ tối thiểu 5% ngẫu nhiên để không bị lặp đi lặp lại một trận đấu bài học
    epsilon_decay = 0.99995 # Giảm từ từ sau hàng trăm ngàn ván
    epsilon = epsilon_start
    
    print(f"=== Bắt đầu huấn luyện AI thông qua {episodes} ván đấu tự chơi ===")
    
    for episode in range(1, episodes + 1):
        history = []
        
        current_word = random.choice(list(word_dict.keys()))
        list_word_da_dung = [current_word]
        
        turn = 1
        game_over = False
        winner = 0
        
        while not game_over:
            current_idx = word_to_idx[current_word]
            
            # === ĐÃ SỬA: Đẩy input lên GPU, chạy xong đẩy về CPU để lấy mảng numpy (Fix lỗi sập dòng 81) ===
            model.eval()
            input_tensor = torch.tensor([current_idx], dtype=torch.long).to(device)
            with torch.no_grad():
                q_values = model(input_tensor).cpu().numpy()[0]
            
            valid_next_words = word_dict.get(current_word, [])
            valid_next_words = [w for w in valid_next_words if w not in list_word_da_dung and w in word_to_idx]
            
            if not valid_next_words:
                winner = 2 if turn == 1 else 1
                game_over = True
            else:
                if random.random() < epsilon:
                    chosen_word = random.choice(valid_next_words)
                else:
                    valid_next_words.sort(key=lambda w: q_values[word_to_idx[w]], reverse=True)
                    chosen_word = valid_next_words[0]
                
                next_idx = word_to_idx[chosen_word]
                
                history.append({
                    "state": current_idx,
                    "action": next_idx,
                    "player": turn,
                    "q_values": q_values.copy(),
                    "word_used": chosen_word # Lưu lại từ để tính toán phần thưởng động
                })
                
                list_word_da_dung.append(chosen_word)
                current_word = chosen_word
                turn = 2 if turn == 1 else 1
                
            if len(history) > 60:
                game_over = True
                
        if winner != 0 and len(history) > 0:
            model.train()
            inputs = []
            targets = []
            
            for i in reversed(range(len(history))):
                step = history[i]
                is_winner = (step["player"] == winner)
                
                # === ĐÃ SỬA: THIẾT KẾ LẠI PHẦN THƯỞNG ĐỘNG (REWARD SHAPING) ===
                # Thay vì thưởng cứng 1 và -1, ta thưởng phạt dựa trên độ hiểm của nước đi
                if is_winner:
                    # Kiểm tra xem từ AI chọn đi tiếp còn bao nhiêu từ chặn hậu đối thủ
                    words_left_for_enemy = word_dict.get(step["word_used"], [])
                    words_left_for_enemy = [w for w in words_left_for_enemy if w not in list_word_da_dung]
                    
                    if len(words_left_for_enemy) == 0:
                        reward = 5.0  # Thưởng cực lớn nếu đi từ "cụt" kết liễu trận đấu!
                    else:
                        reward = 1.0 + (1.0 / (len(words_left_for_enemy) + 1)) # Thưởng nhiều hơn nếu chặn bớt đường đi của địch
                else:
                    reward = -1.0 # Phạt khi thua ván đấu
                # =============================================================
                
                target_q = step["q_values"]
                
                max_future_q = 0
                if i < len(history) - 1:
                    next_state = history[i+1]["state"]
                    # === ĐÃ SỬA: Đẩy dữ liệu trạng thái tương lai lên GPU khớp cấu hình ===
                    next_input = torch.tensor([next_state], dtype=torch.long).to(device)
                    with torch.no_grad():
                        next_q = model(next_input).cpu().numpy()[0]
                    max_future_q = np.max(next_q)
                
                target_q[step["action"]] = reward + gamma * max_future_q
                target_q[step["action"]] = np.clip(target_q[step["action"]], -10.0, 10.0)
                
                inputs.append(step["state"])
                targets.append(target_q)
                
            optimizer.zero_grad()
            # === ĐÃ SỬA: Đẩy toàn bộ dữ liệu Tensor huấn luyện lên GPU (Cực kỳ quan trọng) ===
            inputs_tensor = torch.tensor(inputs, dtype=torch.long).to(device)
            targets_tensor = torch.tensor(targets, dtype=torch.float32).to(device)
            
            outputs = model(inputs_tensor)
            loss = loss_fn(outputs, targets_tensor)
            loss.backward()
            
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            
        # Hạ mức độ ngẫu nhiên xuống theo thời gian ván đấu
        if epsilon > epsilon_min:
            epsilon *= epsilon_decay

        if episode % 500 == 0:
            # Lấy giá trị loss ra hiển thị trên CPU màn hình
            print(f"Ván: {episode}/{episodes} | Lượng Loss: {loss.item():.6f} | Tỷ lệ ngẫu nhiên (Epsilon): {epsilon:.4f}")

        # Mẹo: Cứ sau 50,000 ván tự động lưu backup phòng khi mất điện
        if episode % 50000 == 0:
            torch.save(model.state_dict(), 'word_chain_model.pth')
            print(f"💾 Đã lưu tiến trình tự động tại ván {episode}...")

    # Lưu file model cứng kết quả cuối cùng
    torch.save(model.state_dict(), 'word_chain_model.pth')
    print("=== ĐÃ HUẤN LUYỆN XONG VÀ LƯU MODEL TẠI word_chain_model.pth ===")

if __name__ == "__main__":
    train_ai(500000)