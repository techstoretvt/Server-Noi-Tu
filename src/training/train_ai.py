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

# Tạo danh bạ từ vựng (Vocabulary mapping) từ tất cả các từ có mặt trong file dữ liệu
all_words = sorted(list(set(list(word_dict.keys()) + [item for sublist in word_dict.values() for item in sublist])))
vocab_size = len(all_words)

word_to_idx = {word: idx for idx, word in enumerate(all_words)}
idx_to_word = {idx: word for idx, word in enumerate(all_words)}

# Lưu lại từ vựng để file predict sử dụng sau này
with open('vocab.json', 'w', encoding='utf-8') as f:
    json.dump({"word_to_idx": word_to_idx, "idx_to_word": idx_to_word}, f, ensure_ascii=False, indent=2)

# 2. Định nghĩa Mạng Nơ-ron Sâu (Deep Q-Network) bằng PyTorch
class DQN(nn.Module):
    def __init__(self, vocab_size):
        super(DQN, self).__init__()
        # Lớp nhúng từ (Embedding) biến ID thành Vector 64 chiều lý giải ngữ nghĩa
        self.embedding = nn.Embedding(vocab_size, 64)
        # Các lớp nơ-ron liên kết (Dense Layers)
        self.fc1 = nn.Linear(64, 128)
        self.fc2 = nn.Linear(128, 64)
        self.output_layer = nn.Linear(64, vocab_size) # Đầu ra là điểm số của tất cả các từ trong từ điển

    def forward(self, x):
        x = self.embedding(x)
        x = torch.relu(self.fc1(x))
        x = torch.relu(self.fc2(x))
        return self.output_layer(x)

# Khởi tạo mô hình mạng nơ-ron
model = DQN(vocab_size)
# ------------ ĐOẠN SỬA ĐỂ HỌC NỐI TIẾP ------------
if os.path.exists('word_chain_model.pth'):
    print("=== TÌM THẤY BỘ NÃO CŨ! AI ĐANG NẠP LẠI KINH NGHIỆM ĐỂ HỌC TIẾP... ===")
    model.load_state_dict(torch.load('word_chain_model.pth'))
else:
    print("=== KHÔNG CÓ FILE CŨ, AI SẼ HỌC LẠI TỪ ĐẦU (RESET) ===")
# --------------------------------------------------

optimizer = optim.Adam(model.parameters(), lr=0.0005)
loss_fn = nn.HuberLoss()



# 3. Quá trình Tự đấu (Self-Play Simulation) và Tự học
def train_ai(episodes=5000):
    gamma = 0.9
    epsilon = 0.1 # 10% đi ngẫu nhiên để học nước cờ độc lạ
    
    print(f"=== Bắt đầu huấn luyện AI thông qua {episodes} ván đấu tự chơi ===")
    
    for episode in range(1, episodes + 1):
        list_word_da_dung = []
        history = [] # Lưu lịch sử ván đấu để tính Loss
        
        # Chọn ngẫu nhiên 1 từ bắt đầu có trong dữ liệu gốc
        current_word = random.choice(list(word_dict.keys()))
        
        turn = 1 # 1: Bot A, 2: Bot B
        game_over = False
        winner = 0
        
        while not game_over:
            current_idx = word_to_idx[current_word]
            
            # AI dự đoán điểm số của tất cả các từ đi tiếp
            model.eval()
            with torch.no_grad():
                q_values = model(torch.tensor([current_idx])).numpy()[0]
            
            # Lấy các từ nối hợp lệ từ dữ liệu gốc
            valid_next_words = word_dict.get(current_word, [])
            # Lọc bỏ từ trùng
            valid_next_words = [w for w in valid_next_words if f"{current_word} {w}" not in list_word_da_dung and w in word_to_idx]
            
            if not valid_next_words:
                winner = 2 if turn == 1 else 1
                game_over = True
            else:
                # Epsilon-Greedy chọn nước đi
                if random.random() < epsilon:
                    chosen_word = random.choice(valid_next_words)
                else:
                    # Chọn từ có điểm số DQN dự đoán cao nhất
                    valid_next_words.sort(key=lambda w: q_values[word_to_idx[w]], reverse=True)
                    chosen_word = valid_next_words[0]
                
                next_idx = word_to_idx[chosen_word]
                
                history.append({
                    "state": current_idx,
                    "action": next_idx,
                    "player": turn,
                    "q_values": q_values.copy()
                })
                
                list_word_da_dung.append(f"{current_word} {chosen_word}")
                current_word = chosen_word
                turn = 2 if turn == 1 else 1
                
            if len(history) > 40: # Quá dài -> Ép Hòa
                game_over = True
                
        # Cập nhật thuật toán Lan truyền ngược (Backpropagation) để tối ưu các trọng số mạng nơ-ron
        if winner != 0 and len(history) > 0:
            model.train()
            inputs = []
            targets = []
            
            for i in reversed(range(len(history))):
                step = history[i]
                is_winner = (step["player"] == winner)
                reward = 1.0 if is_winner else -1.0
                
                target_q = step["q_values"]
                
                max_future_q = 0
                if i < len(history) - 1:
                    next_state = history[i+1]["state"]
                    with torch.no_grad():
                        next_q = model(torch.tensor([next_state])).numpy()[0]
                    max_future_q = np.max(next_q)
                
                # Công thức cập nhật Bellman Equation
                target_q[step["action"]] = reward + gamma * max_future_q
                # CHÈN THÊM DÒNG NÀY NGAY PHÍA DƯỚI NÓ:
                # Giới hạn điểm số tối đa là 10, tối thiểu là -10 để ma trận nơ-ron không bị phình to
                target_q[step["action"]] = np.clip(target_q[step["action"]], -10.0, 10.0)
                
                inputs.append(step["state"])
                targets.append(target_q)
                
            # Đưa vào huấn luyện mạng nơ-ron bằng PyTorch
            optimizer.zero_grad()
            inputs_tensor = torch.tensor(inputs)
            targets_tensor = torch.tensor(targets, dtype=torch.float32)
            
            outputs = model(inputs_tensor)
            loss = loss_fn(outputs, targets_tensor)
            loss.backward()
            # --- CHÈN THÊM DÒNG NÀY VÀO ĐÂY ---
            # Giới hạn không cho phép ma trận trọng số biến thiên vượt quá ngưỡng 1.0
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            # ----------------------------------
            optimizer.step()
            
        if episode % 500 == 0:
            print(f"Ván: {episode}/{episodes} | Độ lỗi mạng nơ-ron (Loss): {loss.item():.4f}")

    # Lưu file model cứng (.pth) độc lập hoàn toàn khỏi DB
    torch.save(model.state_dict(), 'word_chain_model.pth')
    print("=== ĐÃ HUẤN LUYỆN XONG VÀ LƯU MODEL TẠI word_chain_model.pth ===")

if __name__ == "__main__":
    train_ai(50000)