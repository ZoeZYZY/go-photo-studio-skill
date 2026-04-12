"""
完整集成系统：StyleGAN2 + FastPhotoStyle + 人脸分析
用于将用户照片转换成明星造型

组件：
1. StyleGAN2Generator - 高质量人脸生成
2. FastPhotoStyler - 真实感风格转移
3. FaceAligner - 人脸检测与对齐
4. PersonStyleTransformer - 完整管道

依赖：
- torch >= 1.0
- torchvision >= 0.5
- tensorflow 1.14 (for StyleGAN2)
- dnnlib (StyleGAN2)
- Pillow
- numpy
"""

import os
import pickle
import numpy as np
import torch
import torch.nn as nn
import torchvision.transforms as transforms
from PIL import Image
from pathlib import Path
import logging

# =====================================================================
# Part 1: StyleGAN2 Generator Component
# =====================================================================

class StyleGAN2Generator:
    """
    StyleGAN2 图像生成器
    负责从潜在向量生成高质量人脸图像
    """
    
    def __init__(self, model_path, truncation_psi=0.5, device='cuda'):
        """
        初始化 StyleGAN2 生成器
        
        Args:
            model_path: .pkl 模型文件路径
            truncation_psi: 截断系数 (0.5-1.0，值越小结果越相似)
            device: 'cuda' 或 'cpu'
        """
        self.device = device
        self.truncation_psi = truncation_psi
        self.model_path = model_path
        
        # 导入 dnnlib 和 TensorFlow
        try:
            import dnnlib
            import dnnlib.tflib as tflib
            self.dnnlib = dnnlib
            self.tflib = tflib
        except ImportError:
            raise ImportError("请安装 StyleGAN2 dependencies: dnnlib, tensorflow")
        
        # 加载模型
        self._load_model()
    
    def _load_model(self):
        """加载预训练 StyleGAN2 模型"""
        print(f"Loading StyleGAN2 from {self.model_path}...")
        
        with open(self.model_path, 'rb') as f:
            self._G, self._D, self.Gs = pickle.load(f)
        
        print("StyleGAN2 model loaded successfully")
    
    def generate_batch(self, seeds, batch_size=1):
        """
        批量生成图像
        
        Args:
            seeds: 随机种子列表
            batch_size: 批处理大小
            
        Returns:
            images: numpy array (N, H, W, 3) in range [0, 255]
        """
        images = []
        
        for seed in seeds:
            # 生成随机向量 z
            rnd = np.random.RandomState(seed)
            z = rnd.randn(1, *self.Gs.input_shape[1:])
            
            # 生成参数配置
            Gs_kwargs = self.dnnlib.EasyDict()
            Gs_kwargs.output_transform = dict(
                func=self.tflib.convert_images_to_uint8,
                nchw_to_nhwc=True
            )
            Gs_kwargs.randomize_noise = False
            if self.truncation_psi is not None:
                Gs_kwargs.truncation_psi = self.truncation_psi
            
            # 生成图像
            generated_images = self.Gs.run(z, None, **Gs_kwargs)
            images.append(generated_images[0])
        
        return np.array(images)
    
    def style_mixing(self, seed_row, seed_col, layer_range):
        """
        风格混合：混合两个种子的风格在指定层范围
        
        Args:
            seed_row: 行种子（主要内容）
            seed_col: 列种子（风格来源）
            layer_range: 层范围 (start, end)
            
        Returns:
            mixed_image: 混合后的图像
        """
        w_avg = self.Gs.get_var('dlatent_avg')
        
        Gs_syn_kwargs = self.dnnlib.EasyDict()
        Gs_syn_kwargs.output_transform = dict(
            func=self.tflib.convert_images_to_uint8,
            nchw_to_nhwc=True
        )
        Gs_syn_kwargs.randomize_noise = False
        
        # 生成两个 W 向量
        z_row = np.random.RandomState(seed_row).randn(*self.Gs.input_shape[1:])
        z_col = np.random.RandomState(seed_col).randn(*self.Gs.input_shape[1:])
        
        w_row = self.Gs.components.mapping.run(z_row[np.newaxis], None)
        w_col = self.Gs.components.mapping.run(z_col[np.newaxis], None)
        
        # 应用截断
        w_row = w_avg + (w_row - w_avg) * self.truncation_psi
        w_col = w_avg + (w_col - w_avg) * self.truncation_psi
        
        # 混合指定层
        w_mixed = w_row.copy()
        w_mixed[0, layer_range[0]:layer_range[1]] = w_col[0, layer_range[0]:layer_range[1]]
        
        # 生成混合图像
        mixed_image = self.Gs.components.synthesis.run(w_mixed, **Gs_syn_kwargs)
        
        return mixed_image[0]


# =====================================================================
# Part 2: FastPhotoStyle Component
# =====================================================================

class FastPhotoStyler:
    """
    FastPhotoStyle 风格转移器
    使用 Whitening & Coloring Transform (WCT) 进行真实感风格转移
    """
    
    def __init__(self, model_dir='PhotoWCTModels', device='cuda'):
        """
        初始化 FastPhotoStyle
        
        Args:
            model_dir: 预训练模型目录
            device: 'cuda' 或 'cpu'
        """
        self.device = device
        self.model_dir = model_dir
        
        # 导入 FastPhotoStyle 组件
        try:
            from photo_wct import PhotoWCT
            from models import VGGEncoder, VGGDecoder
            from smooth_filter import smooth_filter
            
            self.PhotoWCT = PhotoWCT
            self.VGGEncoder = VGGEncoder
            self.VGGDecoder = VGGDecoder
            self.smooth_filter = smooth_filter
            
        except ImportError:
            raise ImportError("请确保 photo_wct.py, models.py, smooth_filter.py 在当前路径")
        
        # 初始化模型
        self.pho_wct = PhotoWCT()
        self._load_pretrained_weights()
        
        if device == 'cuda':
            self.pho_wct.cuda()
    
    def _load_pretrained_weights(self):
        """加载预训练权重"""
        print("Loading FastPhotoStyle pretrained weights...")
        
        model_path = os.path.join(self.model_dir, 'photo_wct.pth')
        
        if not os.path.exists(model_path):
            print(f"Warning: Model not found at {model_path}")
            print("Please run: python download_models.py")
            return
        
        state_dict = torch.load(model_path, map_location=self.device)
        self.pho_wct.load_state_dict(state_dict)
        print("Pretrained weights loaded successfully")
    
    def stylize(self, content_img, style_img, content_seg=None, style_seg=None):
        """
        执行风格转移
        
        Args:
            content_img: 内容图像 (PIL Image 或 路径)
            style_img: 风格图像 (PIL Image 或 路径)
            content_seg: 内容图像语义分割掩码 (可选)
            style_seg: 风格图像语义分割掩码 (可选)
            
        Returns:
            stylized_img: 转移后的图像 (PIL Image)
        """
        # 加载图像
        if isinstance(content_img, str):
            cont_img = Image.open(content_img).convert('RGB')
        else:
            cont_img = content_img
        
        if isinstance(style_img, str):
            styl_img = Image.open(style_img).convert('RGB')
        else:
            styl_img = style_img
        
        # 调整大小（防止内存溢出）
        cont_img = self._resize_image(cont_img)
        styl_img = self._resize_image(styl_img)
        
        # 保存原始大小用于后续恢复
        orig_width = cont_img.width
        orig_height = cont_img.height
        
        # 转换为 Tensor
        cont_tensor = transforms.ToTensor()(cont_img).unsqueeze(0)
        styl_tensor = transforms.ToTensor()(styl_img).unsqueeze(0)
        
        if self.device == 'cuda':
            cont_tensor = cont_tensor.cuda()
            styl_tensor = styl_tensor.cuda()
        
        # 处理分割掩码
        cont_seg_arr = np.asarray(content_seg) if content_seg else False
        styl_seg_arr = np.asarray(style_seg) if style_seg else False
        
        # 执行风格转移
        with torch.no_grad():
            stylized_tensor = self.pho_wct.transform(
                cont_tensor, styl_tensor, cont_seg_arr, styl_seg_arr
            )
        
        # 恢复原始大小
        if stylized_tensor.size(2) != orig_height or stylized_tensor.size(3) != orig_width:
            stylized_tensor = nn.functional.interpolate(
                stylized_tensor,
                size=(orig_height, orig_width),
                mode='bilinear',
                align_corners=False
            )
        
        # 转换回 PIL Image
        stylized_img = self._tensor_to_pil(stylized_tensor)
        
        # 应用平滑滤波（可选）
        stylized_img = self._apply_smoothing(stylized_img, cont_img)
        
        return stylized_img
    
    def _resize_image(self, img):
        """调整图像大小（防止内存溢出）"""
        MIN_SIZE = 256
        MAX_SIZE = 960
        
        if max(img.width, img.height) < MIN_SIZE:
            if img.width > img.height:
                new_width = int(img.width * MIN_SIZE / img.height)
                img.thumbnail((new_width, MIN_SIZE), Image.BICUBIC)
            else:
                new_height = int(img.height * MIN_SIZE / img.width)
                img.thumbnail((MIN_SIZE, new_height), Image.BICUBIC)
        
        if min(img.width, img.height) > MAX_SIZE:
            if img.width > img.height:
                new_width = MAX_SIZE
                new_height = int(img.height * MAX_SIZE / img.width)
                img.thumbnail((new_width, new_height), Image.BICUBIC)
            else:
                new_height = MAX_SIZE
                new_width = int(img.width * MAX_SIZE / img.height)
                img.thumbnail((new_width, new_height), Image.BICUBIC)
        
        return img
    
    def _tensor_to_pil(self, tensor):
        """将 Tensor 转换为 PIL Image"""
        # tensor: (1, 3, H, W) in [0, 1]
        tensor = tensor.squeeze(0)  # (3, H, W)
        tensor = tensor.clamp(0, 1)
        
        # 转换为 numpy
        arr = tensor.cpu().numpy()  # (3, H, W)
        arr = np.transpose(arr, (1, 2, 0))  # (H, W, 3)
        arr = (arr * 255).astype(np.uint8)
        
        return Image.fromarray(arr)
    
    def _apply_smoothing(self, stylized_img, content_img):
        """应用平滑滤波保持边界"""
        try:
            # 调整内容图像大小匹配输出
            content_img = content_img.resize(stylized_img.size)
            
            # 应用平滑滤波
            smoothed_img = self.smooth_filter(
                stylized_img, content_img,
                f_radius=15, f_edge=1e-1
            )
            return smoothed_img
        except Exception as e:
            print(f"Smoothing failed: {e}, returning unsmoothed image")
            return stylized_img


# =====================================================================
# Part 3: Face Analysis Component
# =====================================================================

class FaceAligner:
    """
    人脸检测与对齐
    使用 InsightFace 进行高精度人脸检测和对齐
    """
    
    def __init__(self):
        """初始化人脸检测器"""
        try:
            from insightface.app import FaceAnalysis
            
            self.app = FaceAnalysis(providers=['CUDAExecutionProvider', 'CPUExecutionProvider'])
            self.app.prepare(ctx_id=0, det_size=(640, 640))
            
        except ImportError:
            raise ImportError("请安装 InsightFace: pip install insightface")
    
    def detect_faces(self, image_path):
        """
        检测图像中的人脸
        
        Args:
            image_path: 图像路径或 PIL Image
            
        Returns:
            faces: 人脸信息列表
        """
        if isinstance(image_path, str):
            img = cv2.imread(image_path)
        else:
            img = cv2.cvtColor(np.array(image_path), cv2.COLOR_RGB2BGR)
        
        faces = self.app.get(img)
        return faces
    
    def extract_embedding(self, image_path):
        """
        提取人脸嵌入向量（用于人脸比对）
        
        Args:
            image_path: 图像路径
            
        Returns:
            embedding: 人脸特征向量
        """
        faces = self.detect_faces(image_path)
        
        if len(faces) == 0:
            return None
        
        # 返回第一个人脸的嵌入
        return faces[0].embedding


# =====================================================================
# Part 4: Main Integration Pipeline
# =====================================================================

class PersonStyleTransformer:
    """
    完整的人物风格转换管道
    
    流程：
    1. 加载用户照片和明星风格照片
    2. 提取人脸特征（可选）
    3. 使用 FastPhotoStyle 转移风格
    4. 可选：使用 StyleGAN2 生成标准人脸后再转移
    5. 保存结果
    """
    
    def __init__(self, 
                 stylegan2_model=None,
                 photowct_model_dir='PhotoWCTModels',
                 device='cuda',
                 output_dir='results'):
        """
        初始化完整管道
        
        Args:
            stylegan2_model: StyleGAN2 模型路径 (可选)
            photowct_model_dir: FastPhotoStyle 模型目录
            device: 'cuda' 或 'cpu'
            output_dir: 输出目录
        """
        self.device = device
        self.output_dir = output_dir
        
        # 创建输出目录
        Path(self.output_dir).mkdir(parents=True, exist_ok=True)
        
        # 初始化日志
        self._setup_logging()
        
        # 初始化组件
        self.logger.info("Initializing components...")
        
        # FastPhotoStyle（必需）
        self.photo_styler = FastPhotoStyler(
            model_dir=photowct_model_dir,
            device=device
        )
        
        # StyleGAN2（可选）
        self.stylegan2_gen = None
        if stylegan2_model:
            try:
                self.stylegan2_gen = StyleGAN2Generator(
                    model_path=stylegan2_model,
                    device=device
                )
                self.logger.info("StyleGAN2 initialized")
            except Exception as e:
                self.logger.warning(f"StyleGAN2 initialization failed: {e}")
        
        # 人脸检测（可选）
        try:
            self.face_detector = FaceAligner()
            self.logger.info("Face detector initialized")
        except Exception as e:
            self.logger.warning(f"Face detector initialization failed: {e}")
            self.face_detector = None
    
    def _setup_logging(self):
        """配置日志"""
        self.logger = logging.getLogger(__name__)
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)
    
    def transform_to_celebrity_style(self, 
                                     user_photo_path,
                                     celebrity_style_paths,
                                     use_stylegan2=False,
                                     stylegan2_seed=None):
        """
        将用户照片转换成明星风格
        
        Args:
            user_photo_path: 用户照片路径
            celebrity_style_paths: 明星风格照片路径列表
            use_stylegan2: 是否使用 StyleGAN2 生成中间人脸
            stylegan2_seed: StyleGAN2 种子
            
        Returns:
            results: 转换结果字典 {'style_name': stylized_image, ...}
        """
        self.logger.info(f"Processing user photo: {user_photo_path}")
        
        # 加载用户照片
        user_img = Image.open(user_photo_path).convert('RGB')
        
        # 可选：使用 StyleGAN2 生成标准人脸
        if use_stylegan2 and self.stylegan2_gen:
            self.logger.info("Generating synthetic face with StyleGAN2...")
            seed = stylegan2_seed or np.random.randint(0, 10000)
            synthetic_img = self.stylegan2_gen.generate_batch([seed])[0]
            synthetic_img = Image.fromarray(synthetic_img)
            
            # 使用合成图像作为内容
            content_img = synthetic_img
        else:
            content_img = user_img
        
        # 对每个明星风格执行转移
        results = {}
        
        for i, style_path in enumerate(celebrity_style_paths):
            try:
                style_name = Path(style_path).stem
                self.logger.info(f"Applying style {i+1}/{len(celebrity_style_paths)}: {style_name}")
                
                # 执行风格转移
                stylized_img = self.photo_styler.stylize(
                    content_img, style_path
                )
                
                # 保存结果
                output_path = os.path.join(
                    self.output_dir,
                    f"{Path(user_photo_path).stem}_to_{style_name}.png"
                )
                stylized_img.save(output_path)
                
                results[style_name] = stylized_img
                self.logger.info(f"Saved: {output_path}")
                
            except Exception as e:
                self.logger.error(f"Failed to process style {style_path}: {e}")
                continue
        
        return results
    
    def batch_process(self, user_photos_dir, celebrity_styles_dir):
        """
        批量处理：为目录中的所有用户照片应用所有明星风格
        
        Args:
            user_photos_dir: 用户照片目录
            celebrity_styles_dir: 明星风格照片目录
        """
        user_photos = list(Path(user_photos_dir).glob('*.jpg')) + \
                      list(Path(user_photos_dir).glob('*.png'))
        
        celebrity_styles = list(Path(celebrity_styles_dir).glob('*.jpg')) + \
                          list(Path(celebrity_styles_dir).glob('*.png'))
        
        self.logger.info(f"Found {len(user_photos)} user photos and {len(celebrity_styles)} styles")
        
        for user_photo in user_photos:
            self.transform_to_celebrity_style(
                str(user_photo),
                [str(s) for s in celebrity_styles]
            )


# =====================================================================
# Part 5: Usage Example
# =====================================================================

if __name__ == "__main__":
    """
    使用示例
    """
    
    # 初始化转换器
    transformer = PersonStyleTransformer(
        stylegan2_model='pretrained_models/stylegan2-ffhq-config-f.pkl',  # 可选
        photowct_model_dir='PhotoWCTModels',
        device='cuda',
        output_dir='output_results'
    )
    
    # 示例 1: 单个用户照片 + 多个明星风格
    user_photo = 'input/user_photo.jpg'
    celebrity_styles = [
        'input/celebrity_style_1.jpg',
        'input/celebrity_style_2.jpg',
        'input/celebrity_style_3.jpg'
    ]
    
    results = transformer.transform_to_celebrity_style(
        user_photo,
        celebrity_styles,
        use_stylegan2=False  # 设置为 True 如果想使用 StyleGAN2
    )
    
    print(f"Processing completed! Results saved in output_results/")
    
    # 示例 2: 批量处理
    # transformer.batch_process(
    #     user_photos_dir='input/users',
    #     celebrity_styles_dir='input/celebrities'
    # ) 
