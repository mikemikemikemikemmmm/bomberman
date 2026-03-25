import os
from PIL import Image

def batch_upscale(scale_factor=4):
    # 取得當前執行腳本的目錄
    current_dir = os.getcwd()
    
    # 遍歷資料夾中的所有檔案
    for filename in os.listdir(current_dir):
        # 檢查是否為 PNG 且不是已經處理過的檔案
        if filename.lower().endswith(".png") and not filename.endswith("_4x.png"):
            input_path = os.path.join(current_dir, filename)
            
            # 建立新檔名：原檔名 + _4x.png
            name_part, _ = os.path.splitext(filename)
            output_filename = f"{name_part}_4x.png"
            output_path = os.path.join(current_dir, output_filename)
            
            try:
                with Image.open(input_path) as img:
                    img = img.convert("RGBA")
                    
                    # 計算新尺寸
                    new_size = (img.width * scale_factor, img.height * scale_factor)
                    
                    # 使用最近鄰法縮放以保持像素銳利
                    upscaled_img = img.resize(new_size, resample=Image.NEAREST)
                    
                    # 儲存新檔案
                    upscaled_img.save(output_path, "PNG")
                    print(f"已處理: {filename} -> {output_filename}")
                    
            except Exception as e:
                print(f"處理 {filename} 時發生錯誤: {e}")

if __name__ == "__main__":
    print("開始批次放大像素圖片...")
    batch_upscale(4)
    print("全部完成！")