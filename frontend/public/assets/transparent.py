from PIL import Image

input_path = "item.png"
output_path = "sprites_transparent.png"

target_color = (56, 135, 0)

img = Image.open(input_path).convert("RGBA")
pixels = img.load()

for i in range(img.size[0]):
    for j in range(img.size[1]):
        r, g, b, a = pixels[i, j]

        if (r, g, b) == target_color:
            pixels[i, j] = (r, g, b, 0)  # 設為透明

img.save(output_path)


# from PIL import Image

# target_color = (255, 255, 255)
# transparent_color = (56, 135, 0)

# new_colors = [
#     (200, 50, 50),     # man2.png
#     (200, 120, 40),    # man3.png
#     (120, 60, 160)     # man4.png
# ]

# for idx, new_color in enumerate(new_colors, start=2):
#     img = Image.open("man1.png").convert("RGBA")
#     pixels = img.load()

#     for i in range(img.size[0]):
#         for j in range(img.size[1]):
#             r, g, b, a = pixels[i, j]

#             # 1️⃣ 先處理透明
#             if (r, g, b) == transparent_color:
#                 pixels[i, j] = (r, g, b, 0)

#             # 2️⃣ 再處理換色
#             elif (r, g, b) == target_color:
#                 pixels[i, j] = (*new_color, a)

#     img.save(f"man{idx}.png")