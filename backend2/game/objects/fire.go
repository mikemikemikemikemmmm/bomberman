package objects

import (
	"bomberman/backend2/config"
	"bomberman/backend2/types"
)

type FireObjConfig struct {
	CenterX         int
	CenterY         int
	VerticalStart   int
	VerticalEnd     int
	HorizontalStart int
	HorizontalEnd   int
}

type FireObj struct {
	ObjType     types.ObjType
	RemainingMs uint32
	Config      FireObjConfig
}

func NewFireObj(cfg FireObjConfig) *FireObj {
	return &FireObj{
		ObjType:     types.ObjFire,
		RemainingMs: config.FireCountdownMs,
		Config:      cfg,
	}
}
