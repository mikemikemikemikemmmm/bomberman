use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum ManSpriteKey {
    #[serde(rename = "man1")]
    Man1,
    #[serde(rename = "man2")]
    Man2,
    #[serde(rename = "man3")]
    Man3,
    #[serde(rename = "man4")]
    Man4,
}

impl ManSpriteKey {
    pub fn from_index(i: usize) -> Self {
        match i {
            0 => Self::Man1,
            1 => Self::Man2,
            2 => Self::Man3,
            _ => Self::Man4,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ManDirection {
    #[serde(rename = "up")]
    Up,
    #[serde(rename = "down")]
    Down,
    #[serde(rename = "left")]
    Left,
    #[serde(rename = "right")]
    Right,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ItemType {
    #[serde(rename = "fire")]
    Fire,
    #[serde(rename = "speed")]
    Speed,
    #[serde(rename = "moreBomb")]
    MoreBomb,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GridPos {
    pub x: u32,
    pub y: u32,
}
pub struct MapIndex{
    pub x:u32,
    pub y:u32
}