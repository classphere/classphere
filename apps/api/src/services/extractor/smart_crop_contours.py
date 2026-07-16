import sys
from PIL import Image

def main():
    if len(sys.argv) < 7:
        print("Usage: python smart_crop_contours.py <pagePath> <outPath> <ymin> <xmin> <ymax> <xmax>")
        sys.exit(1)
        
    page_path = sys.argv[1]
    out_path = sys.argv[2]
    ymin = float(sys.argv[3])
    xmin = float(sys.argv[4])
    ymax = float(sys.argv[5])
    xmax = float(sys.argv[6])
    
    try:
        img = Image.open(page_path)
        width, height = img.size
        
        # Bounding boxes are on a 0-1000 scale
        y0 = int((ymin / 1000.0) * height)
        x0 = int((xmin / 1000.0) * width)
        y1 = int((ymax / 1000.0) * height)
        x1 = int((xmax / 1000.0) * width)
        
        # Clip coordinates to bounds
        x0 = max(0, min(x0, width - 1))
        y0 = max(0, min(y0, height - 1))
        x1 = max(0, min(x1, width))
        y1 = max(0, min(y1, height))
        
        # Ensure valid coordinates
        if x1 <= x0: x1 = x0 + 1
        if y1 <= y0: y1 = y0 + 1
        
        cropped = img.crop((x0, y0, x1, y1))
        cropped.save(out_path)
        print("SUCCESS")
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
